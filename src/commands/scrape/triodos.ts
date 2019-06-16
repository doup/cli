import { Command, flags } from '@oclif/command'
import * as puppeteer from 'puppeteer';

export default class ScrapeTriodos extends Command {
    static description = 'download Triodos data'
    static args = []
    static flags = {
        help: flags.help({ char: 'h' }),
    }

    accounts: object = {}

    async run() {
        const browser = await puppeteer.launch({
            // headless: false, // launch headful mode
            // slowMo: 150, // slow down puppeteer script so that it's easier to follow visually
            defaultViewport: { width: 1200, height: 800 }
        });
        const page = await browser.newPage();
        await page.goto('https://www.triodos.es');

        const loginEl = await page.$('.topbar__link--contact .topbar__button');
        await loginEl.click();
        await page.waitForNavigation();

        const userEl = await page.$('#usuario');
        const passwordEl = await page.$('#password');
        const submitEl = await page.$('.access-secure .button');
        await userEl.type('__USER__');
        await passwordEl.type('__PASS__');
        await submitEl.click();
        await page.waitForNavigation();

        const productsListEl = await page.$$('.product-item .product-link');
        const account = '__IBAN__';
        const productlLink = (await Promise.all(productsListEl.map(async (el) => {
            const href = await (await el.getProperty('href')).jsonValue();

            return [el, href];
        }))).find(([el, href]) => {
            return href.indexOf(account) !== -1;
        });

        await productlLink[0].click();
        await page.waitForNavigation();

        await page.hover('.submenu-link');
        const consultLink = await page.$('.submenu-sublist .submenu-link');
        await consultLink.click();
        await page.waitForNavigation();

        const formContainer = await page.$('.collapsed');
        await formContainer.click();
        await page.waitFor(250);

        const monthFilterRadio = await page.$('input[value="getAccountMovementsByDate"]');
        await monthFilterRadio.click();

        await page.select('#month', '4');
        await page.select('#year', '2019');

        const searchButton = await page.$('.button.button1');
        await searchButton.click();
        await page.waitForNavigation();

        // await page.screenshot({path: 'example.png'});

        await page._client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: '/Users/doup/Code/doup-cli',
        });

        const downloadButton = await page.$('.button-file');
        await downloadButton.click();
        await page.waitFor(5000);

        // Loop & check that file is downloaded
        // when done, close browser
        // if more than 10s, error

        await browser.close();
    }
}
