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
- Server.ts
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

- ControllerTest.ts
```
...

import * as ControllerUpload from "../Controller/Upload";

export const api = (app: Express.Express): void => {
    app.post("/upload", (request: Express.Request, response: Express.Response) => {
        ControllerUpload
            .execute(request, true, true, "/path/")
            .then((result) => {
                let fileName = "";

                for (let a = 0; a < result.length; a++) {
                    const resultControllerUpload = result[a];

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

- ControllerUpload.ts
```
...

import { Cfdp, CfdpModel } from "@cimo/form-data_parser/dist/src/Main";

execute = (request: Request, isFileExists: boolean, isDecode: boolean, pathValue: string): Promise<CfdpModel.Iinput[]> => {
    return new Promise((resolve, reject) => {
        const chunkList: Buffer[] = [];

        request.on("data", (data: Buffer) => {
            chunkList.push(data);
        });

        request.on("end", () => {
            const contentType = request.headers["content-type"];

            const buffer = Buffer.concat(chunkList);
            const formDataList = Cfdp.readInput(buffer, contentType);

            const resultCheckRequest = this.checkRequest(formDataList);

            if (resultCheckRequest === "") {
                for (let a = 0; a < formDataList.length; a++) {
                    const formData = formDataList[a];

                    if (formData.name === "file" && formData.fileName && formData.buffer) {
                        const fileName = isDecode ? decodeURIComponent(formData.fileName) : formData.fileName;
                        const pathFile = `${pathValue}${formData.fileName}`;

                        Fs.mkdir(pathValue, { recursive: true }, (error) => {
                            if (!error) {
                                if (isFileExists) {
                                    Fs.access(pathFile, Fs.constants.F_OK, (error) => {
                                        if (!error) {
                                            reject(new Error("File exists."));

                                            return;
                                        }
                                    });
                                }

                                helperSrc.fileWriteStream(pathFile, formData.buffer, (resultFileWriteStream) => {
                                    if (typeof resultFileWriteStream === "boolean" && resultFileWriteStream) {
                                        resolve(formDataList);

                                        return;
                                    } else {
                                        reject(new Error("File write failed."));

                                        return;
                                    }
                                });
                            } else {
                                reject(new Error("Directory creation failed."));

                                return;
                            }
                        });

                        break;
                    }
                }
            } else {
                reject(new Error(resultCheckRequest));

                return;
            }
        });

        request.on("error", (error: Error) => {
            reject(new Error(error.message));

            return;
        });
    });
};

...
```
