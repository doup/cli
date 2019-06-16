import { Command, flags } from '@oclif/command'
import * as parse from 'csv-parse'
import * as fs from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

export default class ImportN26 extends Command {
  static description = 'import N26 CSV to kontuak, generates a temporary YAML'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [
    { name: 'file' },
  ]

  async run() {
    const { args } = this.parse(ImportN26)
    const filePath = join(process.cwd(), args.file)
    const fileContent = await readFile(filePath, 'utf8')
    const csvOptions = {
      columns: ['date', 'payee', '_', 'type', 'item', 'category', 'amount', 'foreignAmount', 'foreignCurrency', 'exchangeRate'],
      delimiter: ',',
      from: 2, // Ignore first row
    }

    parse(fileContent, csvOptions, async (_, entries) => {
      // Reverse, most recent up
      entries.reverse()

      // Add assertion with the Sum Total
      entries[0].assert = entries.reduce((sum, entry) => sum + parseInt(entry.amount * 100, 10), 0) / 100

      // Generate YAML
      let yml = entries.map(entry => {
        let account
        let item = entry.item ? entry.item : `${entry.payee} ${entry.type} (${entry.category})`
        let posting = ["account: 'n26'", `amount: ${entry.amount}`]
        let lines = [
          `- date: ${entry.date}`,
          `  item: '${item}'`
        ]

        if (entry.foreignAmount !== '' && entry.foreignCurrency !== 'EUR') {
          posting.push(`foreignAmount: ${entry.foreignAmount}`)
          posting.push(`foreignCurrency: ${entry.foreignCurrency}`)
        }

        if (entry.assert) {
          lines.push('  assert: true')
          posting.push(`assert: ${entry.assert}`)
        }

        if (entry.category === 'ATM' && entry.amount < 0) {
          account = 'expenses:cash'
        } else if (entry.item.indexOf('N26 Black Membership') !== -1) {
          account = 'expenses:bank:fee'
        } else if (entry.category === 'Bars & Restaurants') {
          account = 'expenses:food:restaurant'
        } else if (entry.category === 'Food & Groceries') {
          account = 'expenses:food:groceries'
        } else {
          account = (entry.amount >= 0 ? 'income' : 'expenses') + ':???'
        }

        lines.push('  postings:')
        lines.push(`    - { ${posting.join(', ')} }`)
        lines.push(`    - { account: '${account}' }`)

        return lines.join('\n')
      }).join('\n\n') + '\n'

      // Save YAML file
      let outPath = `/Users/doup/Dropbox/@doup/kontuak/${entries[0].date.substr(0, 4)}/n26-current/${entries[0].date.substr(5, 2)}-tmp.yml`
      await writeFile(outPath, yml)
    })
  }
}
