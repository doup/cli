import { Command, flags } from '@oclif/command';
import * as parse from 'csv-parse';
import * as fs from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

export default class ImportTriodos extends Command {
    static description = 'import Triodos CSV to kontuak, generates a temporary YAML';

    static flags = {
        help: flags.help({ char: 'h' }),
    };

    static args = [
        { name: 'account' },
        { name: 'file' },
    ];

    async run() {
        const { args } = this.parse(ImportTriodos);
        const filePath = join(process.cwd(), args.file);
        const fileContent = await readFile(filePath, 'utf8');
        const csvOptions = {
            columns: ['_', 'date', 'dateValue', 'item', 'amount', 'total'],
            delimiter: ';',
            from: 2, // Ignore first row
        };

        parse(fileContent, csvOptions, async (_, entries) => {
            // Massage
            entries = entries.map((entry) => {
                entry.date = entry.date.split('/').reverse().join('-');
                entry.dateValue = entry.dateValue.split('/').reverse().join('-');
                entry.amount = entry.amount.replace('.', '').replace(',', '.');
                entry.total = entry.total.replace('.', '').replace(',', '.');

                return entry;
            });

            // Generate YAML
            let yml = entries.map((entry) => {
                let type = entry.amount >= 0 ? 'income' : 'expenses';
                let dateValue = entry.date !== entry.dateValue ? `, dateValue: ${entry.dateValue}` : '';
                let account = args.account === 'current' ? 'triodos:cash' : 'savings';
                let category = `${type}:???`;
                let extraPosting: string[] = [];
                let out = [];

                if (entry.item.indexOf('R.E.AUTONOMOS') !== -1) {
                    account = 'triodos:taxes';
                    category = 'expenses:freelance:autonomo';
                } else if (entry.item.indexOf('RECIBO Som Energia') !== -1) {
                    extraPosting.push(`    - { half: 'cris:home:utilities' }`);
                    category = 'expenses:home:electricity';
                } else if (
                    entry.item.indexOf('IMPUESTO MOD.130') !== -1 ||
                    entry.item.indexOf('IMPUESTO MOD.100') !== -1
                ) {
                    account = 'triodos:taxes';
                    category = 'expenses:freelance:irpf';
                } else if (entry.item.indexOf('TRANSF PARA ROMA ECONOMISTES SC') !== -1) {
                    category = 'expenses:freelance:asesor';
                } else if (entry.item.indexOf('COMPRA TARJETA DEBITO AWS EMEA') !== -1) {
                    category = 'expenses:freelance:ops';
                } else if (entry.item.indexOf('RECIBO Pepemobile') !== -1) {
                    category = 'expenses:phone';
                } else if (entry.item.indexOf('RECIBO PARWING') !== -1) {
                    category = 'expenses:home:rent';
                } else if (entry.item.indexOf('RECIBO AIGUES DE BARCELONA') !== -1) {
                    extraPosting.push(`    - { half: 'cris:home:utilities' }`);
                    category = 'expenses:home:water';
                } else if (entry.item.indexOf('RECIBO Naturgy') !== -1) {
                    extraPosting.push(`    - { half: 'cris:home:utilities' }`);
                    category = 'expenses:home:gas';
                } else if (entry.item.indexOf('TRANSF DE Zemantics OU Invoice') !== -1) {
                    category = 'income:freelance:mobile-jazz';
                } else if (entry.item.indexOf('TRANSF DE Cristina Morro Piris alquiler') !== -1) {
                    category = 'cris:home:rent';
                } else if (entry.item.indexOf('ECOOLTRA') !== -1) {
                    category = 'expenses:transport';
                } else if (entry.item.indexOf('COMISION MANTENIM.') !== -1) {
                    category = 'expenses:bank:fee';
                } else if (entry.item.indexOf('LIQUIDACION AHORRO/CTA COR') !== -1) {
                    category = 'income:interest:bank';
                }

                out.push(`- date: ${entry.date}`);
                out.push(`  item: '${entry.item}'`);
                out.push('  postings:');
                out.push(`    - { account: '${account}', amount: ${entry.amount}${dateValue} }`);

                extraPosting.forEach((posting) => out.push(posting));

                out.push(`    - { account: '${category}' }`);

                return out.join('\n');
            }).join('\n\n');

            // Save YAML file
            const year = entries[0].date.substr(0, 4);
            const month = entries[0].date.substr(5, 2);
            const outPath = `/Users/doup/Dropbox/@doup/kontuak/${year}/triodos-${args.account}/${month}-tmp.yml`;

            await writeFile(outPath, yml);
        });
    }
}
