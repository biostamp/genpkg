import { resolve } from 'path'
import { existsSync } from 'fs'
import * as rimraf from 'rimraf'
import {expect, test} from '@oclif/test'

import cmd = require('../src')

const testDir = resolve(__dirname)

// clear the templdir before each test
beforeEach(() => {
  rimraf.sync(resolve(testDir, '..', 'templdir'))
})

describe('genpkg', () => {
  test
    .stdout()
    .do(() => cmd.run(['templdir', '-t', resolve(testDir, './testtmpl')]))
    .it('creates a pkg from template', (ctx) => {
      expect(existsSync(resolve(testDir, '..', 'templdir'))).to.be.true
      expect(ctx.stdout).to.contain('generated package successfuly')
    })
})
