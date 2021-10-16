import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import {expect, test} from '@oclif/test'

import cmd = require('../src')

const testDir = resolve(__dirname)

describe('genpkg', () => {
  test
    .stdout()
    .do(() => cmd.run(['templdir', '-t', resolve(testDir, './testtmpl')]))
    .it('creates a pkg from template', (ctx) => {
      expect(existsSync(resolve(testDir, '..', 'templdir'))).to.be.true
      expect(ctx.stdout).to.contain('generated package successfuly')
    })
})
