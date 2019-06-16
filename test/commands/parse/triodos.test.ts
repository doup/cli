import {expect, test} from '@oclif/test'

describe('parse:triodos', () => {
  test
    .stdout()
    .command(['parse:triodos'])
    .it('runs hello', ctx => {
      expect(ctx.stdout).to.contain('hello world')
    })

  test
    .stdout()
    .command(['parse:triodos', '--name', 'jeff'])
    .it('runs hello --name jeff', ctx => {
      expect(ctx.stdout).to.contain('hello jeff')
    })
})
