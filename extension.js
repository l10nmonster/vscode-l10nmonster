import vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import { fetchStatusPanel } from './statusPanel.js';
import { fetchJobsPanel, viewJob } from './jobsPanel.js';
import { fetchAnalyzePanel, runAnalyzer } from './analyzePanel.js';
import { withMonsterManager, L10nMonsterViewTreeDataProvider } from './monsterUtils.js';

const l10nConsole = vscode.window.createOutputChannel('L10n Monster', {log: true});

function monsterCommand() {
    vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', true);
    vscode.window.showInformationMessage('L10n Monster initialized');
    vscode.commands.executeCommand('statusView.focus');
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context) {
    l10nConsole.info(`L10n Monster Manager is now active!`);
    const configPath = vscode.workspace.workspaceFolders?.length > 0 && path.resolve(vscode.workspace.workspaceFolders[0].uri.fsPath, 'l10nmonster.mjs');
    vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', false);
    context.subscriptions.push(vscode.commands.registerCommand(
        'l10nmonster.l10nmanager',
        () => withMonsterManager(configPath, monsterCommand)
    ));
    if (configPath && existsSync(configPath)) {
        l10nConsole.info(`L10n Monster config found at: ${configPath}`);
        return withMonsterManager(configPath, async mm => {
            const printCapabilities = cap => Object.entries(cap).filter(e => e[1]).map(e => e[0]).join(', ');
            l10nConsole.info(`L10n Monster initialized. Supported commands: ${printCapabilities(mm.capabilities)}`);
            vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', true);
            const statusViewProvider = new L10nMonsterViewTreeDataProvider(configPath, fetchStatusPanel);
            vscode.window.registerTreeDataProvider('statusView', statusViewProvider);    
            const jobsViewProvider = new L10nMonsterViewTreeDataProvider(configPath, fetchJobsPanel);
            jobsViewProvider.viewJob = viewJob;
            context.subscriptions.push(vscode.commands.registerCommand('l10nmonster.viewJob', (jobGuid, hasRes) => jobsViewProvider.viewJob(jobGuid, hasRes)));
            vscode.window.registerTreeDataProvider('jobsView', jobsViewProvider);
            const analyzeViewProvider = new L10nMonsterViewTreeDataProvider(configPath, fetchAnalyzePanel);
            analyzeViewProvider.runAnalyzer = runAnalyzer;
            context.subscriptions.push(vscode.commands.registerCommand('l10nmonster.runAnalyzer', (name, helpParams) => analyzeViewProvider.runAnalyzer(name, helpParams)));
            vscode.window.registerTreeDataProvider('analyzeView', analyzeViewProvider);
        });
    } else {
        l10nConsole.error(`Could not find L10n Monster config at: ${configPath}`);
    }
}

export function deactivate() {
    l10nConsole.info(`L10n Monster Manager was deactivated!`);
    vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', false);
}
