import * as puppeteer from 'puppeteer';
import { existsSync, mkdtempSync, readFileSync } from 'fs';
import {
    FailedError,
    GetDataSource,
    MethodNotImplementedError,
    Query,
    QueryNotSupportedError,
} from '@mobilejazz/harmony-core';

import { TransactionsByMonthQuery } from '../queries/transaction';
import { rmFolderSync } from '../utils';

export class TriodosTransactionPuppeteerDataSource implements GetDataSource<string> {
    constructor(
        protected username: string,
        protected password: string,
        protected isDebug = false,
    ) {}

    async get(query: Query): Promise<string> {
        if (query instanceof TransactionsByMonthQuery) {
            return this.scrape(query);
        }

        throw new QueryNotSupportedError();
    }

    async getAll(query: Query): Promise<string[]> {
        throw new MethodNotImplementedError();
    }

    protected async scrape(query: TransactionsByMonthQuery): Promise<string> {
        async function getElOrFail(selector: string) {
            const el = await page.$(selector);

            if (el) {
                return el;
            } else {
                throw new FailedError();
            }
        }

        const browser = await puppeteer.launch({
            ...(this.isDebug ? {
                headless: false, // launch headful mode
                slowMo: 50,      // slow down puppeteer script so that it's easier to follow visually
            } : {}),
            defaultViewport: { width: 1200, height: 800 },
        });

        const page = await browser.newPage();
        await page.goto('https://www.triodos.es');

        const loginEl = await getElOrFail('.topbar__link--contact .topbar__button');
        await loginEl.click();
        await page.waitForNavigation();

        const userEl = await getElOrFail('#usuario');
        const passwordEl = await getElOrFail('#password');
        const submitEl = await getElOrFail('.access-secure .button');
        await userEl.type(this.username);
        await passwordEl.type(this.password);
        await submitEl.click();
        await page.waitForNavigation();

        const productsListEl = await page.$$('.product-item .product-link');
        const account = query.account;
        const productlLink = (await Promise.all(productsListEl.map(async (el) => {
            const href = await (await el.getProperty('href')).jsonValue();

            return [el, href];
        }))).find(([el, href]) => {
            return href.indexOf(account) !== -1;
        });

        await productlLink[0].click();
        await page.waitForNavigation();

        await page.hover('.submenu-link');
        const consultLink = await getElOrFail('.submenu-sublist .submenu-link');
        await consultLink.click();
        await page.waitForNavigation();

        const formContainer = await getElOrFail('.collapsed');
        await formContainer.click();
        await page.waitFor(250);

        const monthFilterRadio = await getElOrFail('input[value="getAccountMovementsByDate"]');
        await monthFilterRadio.click();

        await page.select('#month', query.month.toString());
        await page.select('#year', query.year.toString());

        const searchButton = await getElOrFail('.button.button1');
        await searchButton.click();
        await page.waitForNavigation();

        const tmpFolder = mkdtempSync('dp-cli-ttds');
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: tmpFolder,
        });

        const downloadButton = await page.$('.button-file');
        await downloadButton.click();
        await page.waitFor(5000);

        return new Promise((resolve, reject) => {
            let tries = 0;
            const tryInterval = 500;
            const maxTries = 10000 / tryInterval;
            const file = `${tmpFolder}/Data.csv`;
            const checkInterval = setInterval(() => {
                if (existsSync(file)) {
                    browser.close();
                    clearInterval(checkInterval);
                    resolve(readFileSync(file, 'utf8'));
                    rmFolderSync(tmpFolder);
                } else {
                    tries++;

                    if (tries > maxTries) {
                        reject(new FailedError());
                    }
                }
            }, tryInterval);
        });
    }
}
