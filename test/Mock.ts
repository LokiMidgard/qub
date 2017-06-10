import * as qub from "../source/Qub";

export class Disposable implements qub.Disposable {
    public dispose(): void {
    }
}

export class Configuration implements qub.Configuration {
    constructor(private _values: Object = {}) {
    }

    public get<T>(propertyPath: string, defaultValue?: T): T {
        let result: T = defaultValue;

        if (propertyPath && this._values) {
            const propertyPathParts: string[] = propertyPath.split(".");
            let currentValue: any = this._values;

            let index: number = 0;
            for (; index < propertyPathParts.length; ++index) {
                if (!currentValue || !(currentValue instanceof Object)) {
                    break;
                }
                else {
                    const propertyPathPart: string = propertyPathParts[index];
                    currentValue = currentValue[propertyPathPart];
                }
            }

            if (index === propertyPathParts.length) {
                result = currentValue as T;
            }
        }

        return result;
    }
}

export class TextDocument implements qub.TextDocument {
    constructor(private _languageId: string, private _uri: string, private _text: string = "") {
    }

    public getLanguageId(): string {
        return this._languageId;
    }

    public getURI(): string {
        return this._uri;
    }

    public getText(): string {
        return this._text;
    }

    public setText(text: string): void {
        this._text = text;
    }

    public getColumnIndex(characterIndex: number): number {
        return qub.getColumnIndex(this.getText(), characterIndex);
    }

    public getLineIndex(characterIndex: number): number {
        return qub.getLineIndex(this.getText(), characterIndex);
    }

    public getLineIndent(characterIndex: number): string {
        let result: string;

        if (characterIndex >= 0) {
            const previousNewLineCharacterIndex: number = this._text.lastIndexOf("\n", characterIndex - 1);

            // If no previous new line character is found, then -1 is returned. Adding 1 brings us to
            // the beginning of the line.
            let currentIndex: number = previousNewLineCharacterIndex + 1;
            let currentCharacter: string = this._text[currentIndex];

            result = "";
            while (currentCharacter === " " || currentCharacter === "\t") {
                result += currentCharacter;

                ++currentIndex;
                currentCharacter = this._text[currentIndex];
            }
        }

        return result;
    }
}

export class TextEditor implements qub.TextEditor {
    private _cursorIndex: number = 0;
    private _indent: string = "  ";
    private _newline: string = "\n";

    constructor(private _document: TextDocument) {
    }

    public getDocument(): TextDocument {
        return this._document;
    }

    public getCursorIndex(): number {
        return this._cursorIndex;
    }

    public setCursorIndex(cursorIndex: number): void {
        this._cursorIndex = cursorIndex;
    }

    public insert(startIndex: number, text: string): void {
        const documentText: string = this._document.getText();
        const beforeInsert: string = startIndex < 0 ? "" : documentText.substr(0, startIndex);
        const afterInsert: string = startIndex < documentText.length ? documentText.substr(startIndex) : "";
        this._document.setText(beforeInsert + text + afterInsert);

        this.setCursorIndex(startIndex + qub.getLength(text));
    }

    public getIndent(): string {
        return this._indent;
    }

    public setIndent(indent: string): void {
        this._indent = indent;
    }

    public getNewLine(): string {
        return this._newline;
    }

    public setNewLine(newline: string): void {
        this._newline = newline;
    }
}

function simplify(telemetryEvent: qub.TelemetryEvent): qub.TelemetryEvent {
    const newEvent: qub.TelemetryEvent = qub.clone(telemetryEvent);
    const propertiesToStrip: string[] = [
        "extensionName",
        "extensionVersion",
        "locale",
        "machineId",
        "sessionId",
        "osPlatform",
        "utcTimestamp",
        "utcTimestampString"
    ];
    for (const propertyName of propertiesToStrip) {
        delete newEvent[propertyName];
    }
    return newEvent;
}

export class Platform implements qub.Platform {
    private _activeTextEditor: TextEditor;
    private _configuration: qub.Configuration;
    private _installedExtensions = new qub.Map<string, qub.ArrayList<string>>();

    private _configurationChanged: (newConfiguration: qub.Configuration) => void;
    private _activeEditorChanged: (editor: qub.TextEditor) => void;
    private _textDocumentOpened: (openedTextDocument: qub.TextDocument) => void;
    private _textDocumentSaved: (savedTextDocument: qub.TextDocument) => void;
    private _textDocumentChanged: (textDocumentChange: qub.TextDocumentChange) => void;
    private _textDocumentClosed: (closedTextDocument: qub.TextDocument) => void;
    private _provideHover: (textDocument: qub.TextDocument, index: number) => qub.Hover;
    private _provideCompletions: (textDocument: qub.TextDocument, index: number) => qub.Iterable<qub.Completion>;
    private _provideFormattedDocument: (textDocument: qub.TextDocument) => string;

    private _fileTelemetry = new InMemoryTelemetry();
    private _remoteTelemetry: qub.TelemetryEndpoint = new InMemoryTelemetry();
    private _consoleLogs = new qub.ArrayList<string>();

    public dispose(): void {
    }

    /**
     * Invoke a hover action at the provided index of the active text editor.
     */
    public getHoverAt(index: number): qub.Hover {
        let result: qub.Hover;

        if (this._provideHover && qub.isDefined(index) && this._activeTextEditor) {
            const activeDocument: TextDocument = this._activeTextEditor.getDocument();
            if (activeDocument) {
                result = this._provideHover(activeDocument, index);
            }
        }

        return result;
    }

    /**
     * Invoke a get completions action at the provided index of the active text editor.
     */
    public getCompletionsAt(index: number): qub.Iterable<qub.Completion> {
        let result: qub.Iterable<qub.Completion>;

        if (this._provideCompletions && qub.isDefined(index) && this._activeTextEditor) {
            const activeDocument: TextDocument = this._activeTextEditor.getDocument();
            if (activeDocument) {
                result = this._provideCompletions(activeDocument, index);
            }
        }

        if (!result) {
            result = new qub.ArrayList<qub.Completion>();
        }

        return result;
    }

    public getFormattedDocument(): string {
        let result: string;

        if (this._provideFormattedDocument && this._activeTextEditor) {
            const activeDocument: TextDocument = this._activeTextEditor.getDocument();
            if (activeDocument) {
                result = this._provideFormattedDocument(activeDocument);
            }
        }

        return result;
    }

    /**
     * Add an entry to this mock application's registry of installed extensions.
     */
    public addInstalledExtension(publisherName: string, extensionName: string): void {
        let publisherExtensions: qub.ArrayList<string> = this._installedExtensions.get(publisherName);
        if (!publisherExtensions) {
            publisherExtensions = new qub.ArrayList<string>();
            this._installedExtensions.add(publisherName, publisherExtensions);
        }

        if (!publisherExtensions.contains(extensionName)) {
            publisherExtensions.add(extensionName);
        }
    }

    public createFileTelemetry(filePath: string): qub.TelemetryEndpoint {
        return this._fileTelemetry;
    }

    public getFileTelemetryEvents(): qub.Iterable<qub.TelemetryEvent> {
        return this._fileTelemetry.events.map(simplify);
    }

    public setRemoteTelemetry(telemetry: qub.TelemetryEndpoint): void {
        this._remoteTelemetry = telemetry;
    }

    public createRemoteTelemetry(): qub.TelemetryEndpoint {
        return this._remoteTelemetry;
    }

    public getRemoteTelemetryEvents(): qub.Iterable<qub.TelemetryEvent> {
        return this._remoteTelemetry && this._remoteTelemetry instanceof InMemoryTelemetry ? this._remoteTelemetry.events.map(simplify) : new qub.ArrayList<qub.TelemetryEvent>();
    }

    public getActiveTextEditor(): TextEditor {
        return this._activeTextEditor;
    }

    public setActiveTextEditor(activeTextEditor: TextEditor): void {
        if (this._activeTextEditor !== activeTextEditor) {
            this._activeTextEditor = activeTextEditor;

            if (this._activeEditorChanged) {
                this._activeEditorChanged(activeTextEditor);
            }
        }
    }

    public getCursorIndex(): number {
        return this._activeTextEditor ? this._activeTextEditor.getCursorIndex() : undefined;
    }

    public setCursorIndex(cursorIndex: number): void {
        if (this._activeTextEditor) {
            this._activeTextEditor.setCursorIndex(cursorIndex);
        }
    }

    public openTextDocument(textDocument: TextDocument): void {
        this.setActiveTextEditor(new TextEditor(textDocument));

        if (this._textDocumentOpened) {
            this._textDocumentOpened(textDocument);
        }
    }

    public saveTextDocument(textDocument: TextDocument): void {
        if (this._textDocumentSaved) {
            this._textDocumentSaved(textDocument);
        }
    }

    public closeTextDocument(textDocument: TextDocument): void {
        if (this._textDocumentClosed) {
            this._textDocumentClosed(textDocument);
        }

        const activeTextEditor: TextEditor = this.getActiveTextEditor();
        if (activeTextEditor && activeTextEditor.getDocument() === textDocument) {
            this.setActiveTextEditor(null);
        }
    }

    /**
     * Insert the provided text at the provided startIndex in the active text editor.
     */
    public insertText(startIndex: number, text: string): void {
        if (this._activeTextEditor) {
            this._activeTextEditor.insert(startIndex, text);
            if (this._textDocumentChanged) {
                const change = new qub.TextDocumentChange(this._activeTextEditor, new qub.Span(startIndex, 0), text);
                this._textDocumentChanged(change);
            }
        }
    }

    public setActiveEditorChangedCallback(activeEditorChanged: (editor: qub.TextEditor) => void): qub.Disposable {
        this._activeEditorChanged = activeEditorChanged;
        return new Disposable();
    }

    public setConfigurationChangedCallback(callback: () => void): qub.Disposable {
        this._configurationChanged = callback;
        return new Disposable();
    }

    public setTextDocumentOpenedCallback(callback: (openedTextDocument: qub.TextDocument) => void): qub.Disposable {
        this._textDocumentOpened = callback;
        return new Disposable();
    }

    public setTextDocumentSavedCallback(callback: (savedTextDocument: qub.TextDocument) => void): qub.Disposable {
        this._textDocumentSaved = callback;
        return new Disposable();
    }

    public setTextDocumentChangedCallback(callback: (textDocumentChange: qub.TextDocumentChange) => void): qub.Disposable {
        this._textDocumentChanged = callback;
        return new Disposable();
    }

    public setTextDocumentClosedCallback(callback: (closedTextDocument: qub.TextDocument) => void): qub.Disposable {
        this._textDocumentClosed = callback;
        return new Disposable();
    }

    public setProvideHoverCallback(languageId: string, callback: (textDocument: qub.TextDocument, index: number) => qub.Hover): qub.Disposable {
        this._provideHover = callback;
        return new Disposable();
    }

    public setProvideCompletionsCallback(languageId: string, completionTriggerCharacters: string[], callback: (textDocument: qub.TextDocument, index: number) => qub.Iterable<qub.Completion>): qub.Disposable {
        this._provideCompletions = callback;
        return new Disposable();
    }

    public setProvideFormattedDocumentTextCallback(languageId: string, callback: (textDocument: qub.TextDocument) => string): qub.Disposable {
        this._provideFormattedDocument = callback;
        return new Disposable();
    }

    public setTextDocumentIssues(extensionName: string, textDocument: qub.TextDocument, issues: qub.Iterable<qub.Issue>): void {
    }

    public getConfiguration(): qub.Configuration {
        return this._configuration;
    }

    public setConfiguration(configuration: qub.Configuration): void {
        if (this._configuration !== configuration) {
            this._configuration = configuration;
            if (this._configurationChanged) {
                this._configurationChanged(configuration);
            }
        }
    }

    public isExtensionInstalled(publisher: string, extensionName: string): boolean {
        const publisherExtensions: qub.Iterable<string> = this._installedExtensions.get(publisher);
        return publisherExtensions && publisherExtensions.contains(extensionName) ? true : false;
    }

    public getLocale(): string {
        return "MOCK_LOCALE";
    }

    public getMachineId(): string {
        return "MOCK_MACHINE_ID";
    }

    public getSessionId(): string {
        return "MOCK_SESSION_ID";
    }

    public getOperatingSystem(): string {
        return "MOCK_OPERATING_SYSTEM";
    }

    public consoleLog(message: string): void {
        this._consoleLogs.add(message);
    }

    /**
     * Get the logs that have been written to the console.
     */
    public getConsoleLogs(): qub.Iterable<string> {
        return this._consoleLogs;
    }
}

export class InMemoryTelemetry extends qub.TelemetryEndpoint {
    private _events = new qub.ArrayList<qub.TelemetryEvent>();

    public get events(): qub.Iterable<qub.TelemetryEvent> {
        return this._events;
    }

    public log(event: qub.TelemetryEvent) {
        this._events.add(event);
    }
}