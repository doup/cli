import { Command, flags } from '@oclif/command';
import * as fs from 'fs';
import * as YAML from 'yaml';
import { join } from 'path';
import { promisify } from 'util';
import { getTransactions } from '../../../lib/import/triodos';
import { Categorizer } from '../../../lib/categorizer';
import { getYAML } from '../../../lib/yaml';

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
        const account = args.account === 'current' ? 'triodos:cash' : 'savings';
        const transactions = await getTransactions(account, fileContent);
        const rules = YAML.parse(await readFile('/Users/doup/Dropbox/@doup/kontuak/category-rules.yml', 'utf8'));
        const categorizer = new Categorizer(rules);
        const yml = getYAML(transactions.map(tr => categorizer.categorize(tr)));

        // Save YAML file
        const year = transactions[0].date.substr(0, 4);
        const month = transactions[0].date.substr(5, 2);
        const outPath = `/Users/doup/Dropbox/@doup/kontuak/${year}/triodos-${args.account}/${month}-tmp.yml`;

        await writeFile(outPath, yml);
    }
}
