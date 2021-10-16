import { ux } from 'cli-ux'
import * as rimraf from 'rimraf'
import * as path from 'path'
import { existsSync } from 'fs'
import * as inquirer from 'inquirer'
import * as Metalsmith from 'metalsmith'
import * as download from 'download-git-repo'
import * as consolidate from 'consolidate'
import { Command, flags } from '@oclif/command'
import { isLocalPath, TEMPLATE_DIR, addDefaultBranch } from './utils'

// define render function
const render = consolidate.handlebars.render

// Support types from prompt-for which was used before
const promptMapping: any = {
  string: 'input',
  boolean: 'confirm',
}

interface MetadataPrompValue {
  type: string,
  label: string,
  message: string,
  choices: string[],
  validate: (value: string) => boolean,
  default?: any,
  required?: boolean,
}

// prompt interface
interface MetadataPrompts {
  [key: string]: MetadataPrompValue,
}

// metadata option file definition
interface MetadataOptions {
  completeMessage: string,
  prompts: MetadataPrompts,
}

class Genpkg extends Command {
  static description = 'Generate a package from package templates simply'

  // Define the command flags
  static flags = {
    // add --version flag to show CLI version
    version: flags.version({ char: 'v' }),
    // add --help flag to show CLI version
    help: flags.help({ char: 'h' }),
    // add --template flag to define the template source
    template: flags.string({ char: 't', description: 'template source (by default pulls the #main branch)', required: true }),
  }

  // Define the command arguments
  static args = [
    {
      name: 'dirname',
      required: true,
      description: 'The project location',
    },
  ]

  /**
   * Returns the path to template after checking if the template
   * exists in the filesystem
   * @param tp - Template path in local filesystem.
   * @returns {Promise.<string>} - The absolute path to the template.
   */
  loadLocalTemplate(tp: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (existsSync(tp)) {
        resolve(tp)
      } else {
        reject(new Error(`template path ${tp} does not exist`))
      }
    })
  }

  /**
   * Returns the path to the downloaded template repository
   * from the local filesystem.
   *
   * @param tp - Template path in git provider.
   * @returns {Promise.<string>} - The absolute path to the template.
   */
  downloadTemplate(tp: string): Promise<string> {
    ux.action.start('Downloading template')

    // clean template dir
    if (existsSync(TEMPLATE_DIR)) {
      rimraf.sync(TEMPLATE_DIR)
    }

    // promisify the git download function
    return new Promise((resolve, reject) => {
      download(addDefaultBranch(tp), TEMPLATE_DIR, { clone: false }, (err: any) => {
        // handle results
        if (err) {
          ux.action.stop('failed')

          reject(err)
          this.error(`unable to download template from: ${tp}.\n${err.message}`)
        } else {
          ux.action.stop('done')

          resolve(TEMPLATE_DIR)
        }
      })
    })
  }

  /**
   * Returns the path to the template directory from the template source
   * in GitHub/BitBucket/GitLab or LocalRepository.
   * @param templatePath The path to the template repository provided by the user.
   * @returns {Promise.<string>} - The absolute path to the final repository.
   */
  getTemplate(templatePath: string): Promise<string> {
    return isLocalPath(templatePath)
      ? this.loadLocalTemplate(templatePath)
      : this.downloadTemplate(templatePath)
  }

  /**
   * Get meta.js(on) options file.
   *
   * @param dir - The path to the template repository.
   * @returns {MetaOptions} - The meta.js(on) options file.
   */
  getMetadata(dir: string): MetadataOptions {
    const js = path.join(dir, 'meta.js')
    const json = path.join(dir, 'meta.json')
    let opts: MetadataOptions = {
      completeMessage: '',
      prompts: {},
    }

    // check which file exists
    if (existsSync(json)) {
      opts = require(path.resolve(json))
    } else if (existsSync(js)) {
      const req = require(path.resolve(js))
      if (req !== Object(req)) {
        throw new Error('meta.js needs to expose an object')
      }

      opts = req
    }

    return opts
  }

  /**
   * Prompt questions and save answers to metalsmith metadata.
   *
   * @param data - The metalsmith metadata.
   * @param key - The key of the prompt.
   * @param prompt - The prompt object.
   * @returns {Promise.<any>} - The promise of the prompt.
   */
  async prompt(data: any, key: string, prompt: MetadataPrompValue): Promise<any> {
    let promptDefault = prompt.default
    if (typeof prompt.default === 'function') {
      promptDefault = function () {
        return prompt.default.bind(this)(data)
      }
    }

    return inquirer.prompt([{
      type: promptMapping[prompt.type] || prompt.type,
      name: key,
      message: prompt.message || prompt.label || key,
      default: promptDefault,
      choices: prompt.choices || [],
      validate: prompt.validate || (() => true),
    }]).then((answers: any) => {
      if (Array.isArray(answers[key])) {
        data[key] = {}
        answers[key].forEach((multiChoiceAnswer: string) => {
          data[key][multiChoiceAnswer] = true
        })
      } else if (typeof answers[key] === 'string') {
        data[key] = answers[key].replace(/"/g, '\\"')
      } else {
        data[key] = answers[key]
      }
    })
  }

  /**
   * Ask questions and save answers to metalsmith metadata.
   *
   * @param {MetadataPrompts} prompts - The prompts object.
   * @param {Metalsmith} metalsmith - The metalsmith instance.
   * @param {Metalsmith.Callback} done - The metalsmith callback.
   * @returns {Promise.<void>} - The promise of the prompt.
   */
  async ask(prompts: MetadataPrompts, metalsmith: Metalsmith, done: Metalsmith.Callback) {
    try {
      const data = metalsmith.metadata()

      for (const key of Object.keys(prompts)) {
        await this.prompt(data, key, prompts[key]) // eslint-disable-line no-await-in-loop
      }

      done(null, {}, metalsmith)
    } catch (error: unknown) {
      if (error instanceof Error) {
        done(error, {}, metalsmith)
      }
    }
  }

  /**
   * Create middleware for asking questions.
   *
   * @param {MetadataPrompts} prompts - The prompts object.
   * @returns {Metalsmith.Plugin} - The plugin.
   */
  askQuestions(prompts: MetadataPrompts): (files: Metalsmith.Files, metalsmith: Metalsmith, done: Metalsmith.Callback) => void {
    return (files: Metalsmith.Files, metalsmit: Metalsmith, done: Metalsmith.Callback) => {
      this.ask(prompts, metalsmit, done)
    }
  }

  /**
   * Render the template files
   *
   * @returns {Metalsmith.Plugin} - The plugin.
   */
  renderTemplateFiles(): (files: Metalsmith.Files, metalsmith: Metalsmith, done: Metalsmith.Callback) => void {
    return (files: Metalsmith.Files, metalsmith: Metalsmith, done: Metalsmith.Callback) => {
      const keys = Object.keys(files)
      const metalsmithMetadata = metalsmith.metadata()

      // render template for each file
      keys.map((file) => {
        const str = files[file].contents.toString()

        // do not attempt to render files that do not have mustaches
        if (!/{{([^{}]+)}}/g.test(str)) {
          return
        }

        // render template
        return new Promise((resolve, reject) => {
          render(str, metalsmithMetadata, (err: any, res: string) => {
            if (err) {
              err.message = `[${file}] ${err.message}`
              return reject(err)
            }

            files[file].contents = Buffer.from(res)
            return resolve(files[file].contents)
          })
        })
      })

      // call the done callback
      done(null, {}, metalsmith)
    }
  }

  /**
   * Log message.
   *
   * @param message Message to log.
   * @param data - Custom data to log.
   * @returns {void} - Nothing.
   */
  logMessage(message: string, data: any): void {
    if (message) {
      render(message, data, (err: any, res: string) => {
        if (err) {
          this.error('\n   Error when rendering template complete message: ' + err.message.trim())
        } else {
          this.log('\n' + res.split(/\r?\n/g).map((line) => '   ' + line).join('\n'))
        }
      })
    }
  }

  /**
   * Generate a package from a template repository.
   *
   * @param local - The path to the template repository.
   * @param dest - The destination path for the generated package.
   * @returns {Promise.<void>} - The promise of the template generation.
   */
  async generatePackage(local: string, dest: string): Promise<void> {
    // get options from meta.js(on) on template
    const opts = this.getMetadata(local)
    const metalsmith = Metalsmith(path.join(local, 'template')) // eslint-disable-line new-cap
    const data = {
      ...metalsmith.metadata(),
      destDirName: dest,
      inPlace: path.resolve(dest) === process.cwd(),
      noEscape: true,
    }

    // render template
    return new Promise((resolve, reject) => {
      metalsmith
        .use(this.askQuestions(opts.prompts))
        .use(this.renderTemplateFiles())
        .clean(false)
        .source('.')
        .destination(path.resolve(dest))
        .build((err: any) => {
          if (err) {
            reject(err)
          }

          // show complete message
          this.logMessage(opts.completeMessage, data)
          resolve()
        })
    })
  }

  /**
   * Run the package generator
   *
   * @returns {Promise.<void>} - The promise of the CLI command run
   */
  async run(): Promise<void> {
    // parse the command line arguments
    const { args, flags } = this.parse(Genpkg)

    try {
      // clone the template repository
      const templatePath: string = await this.getTemplate(flags.template)

      try {
        // generate the package
        await this.generatePackage(templatePath, args.dirname || '.')
      } catch (error: unknown) {
        if (error instanceof Error) {
          this.error(`unable to generate template.\n${error.message}`)
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        // log the error
        this.error(`unable to get template from: ${flags.template}.\n${error.message}`)
      }
    }

    this.log('generated package successfuly')
  }
}

export = Genpkg
