# Npm_form-data_parser

Npm package, parser for the form-data request. Light, fast and secure.
Writed with native Typescript code and no dependencies are used.

## Pack

1. npm run build
2. Copy the file "/build/package_name-x.x.x.tgz" in the project root folder.
3. In the "package.json" file insert: "@cimo/package_name": "file:package_name-x.x.x.tgz"

## Publish

1. npm run build
2. npm login --auth-type=legacy
3. npm publish --auth-type=legacy --access public

## Installation

1. Link for npm package -> https://www.npmjs.com/package/@cimo/form-data_parser

## Server - Example with "NodeJs Express"

-   Server.ts

```
...

import * as ControllerTest from "../Controller/Test";

...

server.listen(8080, () => {

    ...

    ControllerTest.api(app);
});

...
```

-   ControllerTest.ts

```
...

import * as ControllerUpload from "../Controller/Upload";

export const api = (app: Express.Express): void => {
    app.post("/upload", (request: Express.Request, response: Express.Response) => {
        ControllerUpload
            .execute(request, false)
            .then((resultControllerUploadList) => {
                let fileName = "";

                for (const resultControllerUpload of resultControllerUploadList) {
                    if (resultControllerUpload.name === "file" && resultControllerUpload.fileName) {
                        fileName = resultControllerUpload.fileName;

                        break;
                    }
                }

                response.status(200).send({ fileName: `${fileName}` });
            })
            .catch((error: Error) => {
                response.status(200).send({ Error: "Upload failed." });
            });
    });
};

...
```

-   ControllerUpload.ts

```
...

import { Cfdp, CfdpModel } from "@cimo/form-data_parser/dist/src/Main";

export const execute = (request: Express.Request, isFileExists: boolean): Promise<CfdpModel.Iinput[]> => {
    return new Promise((resolve, reject) => {
        const chunkList: Buffer[] = [];

        request.on("data", (data: Buffer) => {
            chunkList.push(data);
        });

        request.on("end", () => {
            const contentType = request.headers["content-type"];

            const buffer = Buffer.concat(chunkList);
            const formDataList = Cfdp.readInput(buffer, contentType);

            for (const formData of formDataList) {
                if (formData.name === "file" && formData.fileName && formData.buffer) {
                    const input = `/home/app/file/input/${formData.fileName}`;

                    if (isFileExists && Fs.existsSync(input)) {
                        reject("File exists.");

                        return;
                    } else {
                        // Write the file "formData.buffer"

                        resolve(formDataList);

                        return;
                    }

                    break;
                }
            }
        });

        request.on("error", (error: Error) => {
            reject(error);

            return;
        });
    });
};

...
```
