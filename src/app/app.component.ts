import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit {

  @ViewChild('editor', { static: true }) editor: ElementRef<HTMLDivElement>;

  baseUrl = '/assets/lib';
  private _monaco;
  get monaco() {
    return this._monaco || (window as any).monaco;
  }
  get require() {
    return (window as any).require;
  }

  /** Entry point */
  ngOnInit() {
    this.injectMonacoLoader()
      .then(this.loadModules.bind(this, ['vs/editor/editor.main']))
      .then(monaco => (this._monaco = monaco))
      .then(this.loadModules.bind(this, [
        'vs/editor/editor.main.nls',
        //'vs/basic-languages/monaco.contribution',
        'vs/language/yaml/monaco.contribution'
      ]))
      .then(this.createEditor.bind(this))
      ;
  }

  /** Injects the AMD loader, used to load the editor and other moving parts */
  private injectMonacoLoader() {
    return new Promise<void>((resolve, reject) => {
      /** Already setup, resolve */
      if (this.monaco) {
        return resolve();
      }
      /** Raised when the Monaco AMD loader has been injected, will configure require paths */
      const onMonacoLoaderInjected = () => {
        this.require.config({
          baseUrl: this.baseUrl,
          paths: { vs: 'vs' }
        });
        resolve();
      };
      /** Raised when the Monaco loaded failed to be injected */
      const onMonacoLoaderInjectionError = (error: ErrorEvent) => reject(error);

      /** Create script element to inject the loader */
      const loaderScript = document.createElement('script');
      loaderScript.src = [this.baseUrl, 'vs/loader.js']
        .filter(p => !!p)
        .join('/');
      loaderScript.addEventListener('load', onMonacoLoaderInjected);
      loaderScript.addEventListener('error', onMonacoLoaderInjectionError);
      document.body.append(loaderScript);
    });
  }

  /** Function used to load Monaco editor and its plugins */
  loadModules<T>(dependencies: string[]): Promise<T> {
    return new Promise((resolve, reject) => this.require(dependencies, resolve));
  }

  /** Init editor UI */
  createEditor(): Promise<void> {
    const modelUri = this.monaco.Uri.parse('a://b/foo.json');
    this.monaco.languages.yaml.yamlDefaults.setDiagnosticsOptions({
      enableSchemaRequest: true,
      hover: true,
      completion: true,
      validate: true,
      format: true,
      schemas: [
        {
          uri: 'http://myserver/foo-schema.json', // id of the first schema
          fileMatch: [modelUri.toString()], // associate with our model
          schema: {
            type: 'object',
            properties: {
              p1: {
                enum: ['v1', 'v2'],
              },
              p2: {
                $ref: 'http://myserver/bar-schema.json', // reference the second schema
              },
            },
          },
        },
        {
          uri: 'http://myserver/bar-schema.json', // id of the first schema
          schema: {
            type: 'object',
            properties: {
              q1: {
                enum: ['x1', 'x2'],
              },
            },
          },
        },
      ],
    });
    const yamlSample = `p1: `;
    this.monaco.editor.create(this.editor.nativeElement, {
      theme: 'vs-dark',
      language: 'yaml',
      model: this.monaco.editor.createModel(yamlSample, 'yaml', modelUri)
    });
    return Promise.resolve();
  }
}
