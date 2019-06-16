import {expect, test} from '@oclif/test'

describe('kontuak:update', () => {
  test
    .stdout()
    .command(['kontuak:update'])
    .it('runs hello', ctx => {
      expect(ctx.stdout).to.contain('hello world')
    })

  test
    .stdout()
    .command(['kontuak:update', '--name', 'jeff'])
    .it('runs hello --name jeff', ctx => {
      expect(ctx.stdout).to.contain('hello jeff')
    })
})
