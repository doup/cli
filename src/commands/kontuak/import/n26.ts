import { Command, flags } from '@oclif/command';
import * as fs from 'fs';
import * as YAML from 'yaml';
import { join } from 'path';
import { promisify } from 'util';
import { getYAML } from '../../../lib/yaml';
import { getTransactions } from '../../../lib/import/n26';
import { Categorizer } from '../../../lib/categorizer';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

export default class ImportN26 extends Command {
    static description = 'import N26 CSV to kontuak, generates a temporary YAML';

    static flags = {
        help: flags.help({ char: 'h' }),
    };

    static args = [
        { name: 'file' },
    ];

    async run() {
        const { args } = this.parse(ImportN26);
        const filePath = join(process.cwd(), args.file);
        const fileContent = await readFile(filePath, 'utf8');
        const transactions = await getTransactions(fileContent);
        const rules = YAML.parse(await readFile('/Users/doup/Dropbox/@doup/kontuak/category-rules.yml', 'utf8'));
        const categorizer = new Categorizer(rules);
        const yml = getYAML(transactions.map(tr => categorizer.categorize(tr)));

        // Save YAML file
        const year = transactions[0].date.substr(0, 4);
        const month = transactions[0].date.substr(5, 2);
        const outPath = `/Users/doup/Dropbox/@doup/kontuak/${year}/n26-current/${month}-tmp.yml`;

        await writeFile(outPath, yml);
    }
}
