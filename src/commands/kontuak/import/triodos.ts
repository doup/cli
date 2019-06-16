import { Command, flags } from '@oclif/command'
import * as parse from 'csv-parse'
import * as fs from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

export default class ImportTriodos extends Command {
  static description = 'import Triodos CSV to kontuak, generates a temporary YAML'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [
    { name: 'account' },
    { name: 'file' },
  ]

  async run() {
    const { args } = this.parse(ImportTriodos)
    const filePath = join(process.cwd(), args.file)
    const fileContent = await readFile(filePath, 'utf8')
    const csvOptions = {
      columns: ['_', 'date', 'dateValue', 'item', 'amount', 'total'],
      delimiter: ';',
      from: 2, // Ignore first row
    }

    parse(fileContent, csvOptions, async (_, entries) => {
      // Massage
      entries = entries.map(entry => {
        entry.date = entry.date.split('/').reverse().join('-')
        entry.dateValue = entry.dateValue.split('/').reverse().join('-')
        entry.amount = entry.amount.replace('.', '').replace(',', '.')
        entry.total = entry.total.replace('.', '').replace(',', '.')

        return entry
      })

      // Generate YAML
      let yml = entries.map(entry => {
        let type = entry.amount >= 0 ? 'income' : 'expenses'
        let dateValue = entry.date !== entry.dateValue ? `, dateValue: ${entry.dateValue}` : ''
        let account = args.account === 'current' ? 'triodos:cash' : 'savings'

        return [
          `- date: ${entry.date}`,
          `  item: '${entry.item}'`,
          '  postings:',
          `    - { account: '${account}', amount: ${entry.amount}, assert: ${entry.total}${dateValue} }`,
          `    - { account: '${type}:???' }`,
        ].join('\n')
      }).join('\n\n')

      // Save YAML file
      let outPath = `/Users/doup/Dropbox/@doup/kontuak/${entries[0].date.substr(0, 4)}/triodos-${args.account}/${entries[0].date.substr(5, 2)}-tmp.yml`
      await writeFile(outPath, yml)
    })
  }
}
