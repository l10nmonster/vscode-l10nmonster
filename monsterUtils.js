import vscode from 'vscode';
import { createMonsterManager } from '@l10nmonster/l10nmonster/src/defaultMonster.js';

export function withMonsterManager(configPath, cb) {
    return (async () => {
        const mm = await createMonsterManager(configPath, {});
        let result;
        if (mm) {
            result = await cb(mm);
            await mm.shutdown();    
        }
        return result;
    })();
}

function enumerateKeys(siblings, parentKey) {
    const getPrefix = (element) => element.parentKey ? `${element.parentKey}.` : '';
    siblings.forEach(element => {
        element.parentKey = parentKey;
        element.fqKey = `${getPrefix(element)}${element.key}`;
    });
    return siblings.map(element => `${getPrefix(element)}${element.key}`);
}

function getElementByKey(siblings, keyparts) {
    const [baseKey, ...childKeys] = keyparts;
    let element;
    for (const e of siblings) {
        if (e.key === baseKey) {
            element = e;
            break;
        }
    }
    if (element) {
        if (childKeys.length > 0) {
            return getElementByKey(element.children, childKeys);
        } else {
            return element;
        }
    }
    console.error(`Could not find ${baseKey} among siblings`);
    return undefined;
}

export class L10nMonsterViewTreeDataProvider {
    constructor(configPath, dataFetcher) {
        this.configPath = configPath;
        this.dataFetcher = dataFetcher;
    }

    getChildren(key) {
        if (!key) { // root
            if (!this.cachedStatus) {
                return withMonsterManager(this.configPath, async mm => {
                    this.cachedStatus = await this.dataFetcher(mm);
                    return enumerateKeys(this.cachedStatus);
                });
            }
            console.log('Somehow root was fetched again')
            return Promise.resolve(enumerateKeys(this.cachedStatus));
        }
        const element = getElementByKey(this.cachedStatus, key.split('.'));
        if (!element.children) {
            console.error(`Somehow a leaf was collapsed at key: ${key}`);
            return Promise.resolve([]);
        } else { // inner collapsable
            return Promise.resolve(enumerateKeys(element.children, element.fqKey));
        }
    }

    getTreeItem(key) {
        const element = getElementByKey(this.cachedStatus, key.split('.'));
        const item = new vscode.TreeItem(element.label, element.children ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        element.command && (item.command = element.command);
        element.description && (item.description = element.description);
        element.tooltip && (item.tooltip = element.tooltip);
        element.iconPath && (item.iconPath = element.iconPath);
        return item;
    }
}

export function getMonsterPage(title, body) {
    return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    font-family: Arial, Helvetica, sans-serif;
                    border-collapse: collapse;
                    width: 100%;
                }
                td, th {
                    font-family: Arial, Helvetica, sans-serif;
                    border: 1px solid #ddd;
                    padding: 8px;
                }

                tr:nth-child(even){background-color: #f2f2f2;}

                tr:hover {background-color: #ddd;}

                th {
                    padding-top: 12px;
                    padding-bottom: 12px;
                    text-align: left;
                    background-color: #04AA6D;
                    color: white;
                }
            </style>
        </head>
        <body>${body}</body>
    </html>`;
}