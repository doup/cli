import { Command, flags } from '@oclif/command';

export default class ScrapeN26 extends Command {
    static description = 'download N26 data';
    static args = [];
    static flags = {
        help: flags.help({ char: 'h' }),
    };

    accounts: object = {};

    async run() {
    }
}
