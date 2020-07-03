import { existsSync, readdirSync, lstatSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';

// Thanks: https://stackoverflow.com/a/32197381
export function rmFolderSync(path: string): void {
    if (existsSync(path)) {
        readdirSync(path).forEach((file) => {
            const curPath = join(path, file);

            if (lstatSync(curPath).isDirectory()) {
                rmFolderSync(curPath);
            } else {
                unlinkSync(curPath);
            }
        });

        rmdirSync(path);
    }
}
