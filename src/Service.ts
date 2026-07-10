// Source
import * as model from "./Model.js";

const propertyDefine = (input: model.Iinput, label: string, value: Buffer | Record<string, number> | string | number): void => {
    Object.defineProperty(input, label, {
        value: value,
        writable: true,
        enumerable: true,
        configurable: true
    });
};

const processData = (header: model.Iheader): model.Iinput => {
    const resultObject = {} as model.Iinput;

    const contentDispositionSplit = header.contentDisposition.split(";");

    if (contentDispositionSplit) {
        const nameRaw = contentDispositionSplit[1] ? contentDispositionSplit[1].split("=")[1] : undefined;
        const name = nameRaw ? nameRaw.replace(/"/g, "").trim() : "";
        const buffer = Buffer.from(header.byteList);
        const fileNameRaw = contentDispositionSplit[2] ? contentDispositionSplit[2].split("=")[1] : undefined;
        const fileName = fileNameRaw ? fileNameRaw.trim() : "";

        propertyDefine(resultObject, "name", name);

        propertyDefine(resultObject, "buffer", buffer);

        if (fileName) {
            const fileNameClean = fileName.replace(/"/g, "").trim();
            propertyDefine(resultObject, "fileName", fileNameClean);

            const mimeType = header.contentType.split(":")[1] ? header.contentType.split(":")[1].trim() : "";
            propertyDefine(resultObject, "mimeType", mimeType);

            const size = Buffer.byteLength(buffer).toString();
            propertyDefine(resultObject, "size", size);
        }
    }

    return resultObject;
};

export const readInput = (buffer: Buffer, contentType: string | undefined): model.Iinput[] => {
    const resultList: model.Iinput[] = [];

    if (contentType) {
        const boundary = contentType.replace("multipart/form-data; boundary=", "");

        let line = "";
        let readState = model.EreadState.INIT;
        let headerInputList: string[] = [];
        let headerContentDisposition = "";
        let headerContentType = "";
        let byteList: number[] = [];

        for (let a = 0; a < buffer.length; a++) {
            const byte = buffer[a];
            const prevByte = a > 0 ? buffer[a - 1] : null;
            const characterNewLine = byte === 0x0a || byte === 0x0d;
            const characterReturn = byte === 0x0a && prevByte === 0x0d;

            if (!characterNewLine) {
                line += String.fromCharCode(byte);
            }

            if (characterReturn && readState === model.EreadState.INIT) {
                if (line == "--" + boundary) {
                    readState = model.EreadState.HEADER;
                }

                line = "";
            } else if (characterReturn && readState === model.EreadState.HEADER) {
                if (line.length) {
                    headerInputList.push(line);
                } else {
                    readState = model.EreadState.DATA;

                    for (let b = 0; b < headerInputList.length; b++) {
                        const headerInput = headerInputList[b];

                        if (headerInput.toLowerCase().startsWith("content-disposition:")) {
                            headerContentDisposition = headerInput;
                        } else if (headerInput.toLowerCase().startsWith("content-type:")) {
                            headerContentType = headerInput;
                        }
                    }

                    byteList = [];
                }

                line = "";
            } else if (readState === model.EreadState.DATA) {
                if (line.length > boundary.length + 4) {
                    line = "";
                }

                if (line === "--" + boundary) {
                    readState = model.EreadState.SEPARATOR;

                    const difference = byteList.length - line.length;
                    const byteListSlice = byteList.slice(0, difference - 1);

                    const input = processData({
                        contentDisposition: headerContentDisposition,
                        contentType: headerContentType,
                        byteList: byteListSlice
                    });

                    resultList.push(input);

                    line = "";
                    headerInputList = [];
                    headerContentDisposition = "";
                    headerContentType = "";
                    byteList = [];
                } else {
                    byteList.push(byte);
                }

                if (characterReturn) {
                    line = "";
                }
            } else if (characterReturn && readState === model.EreadState.SEPARATOR) {
                readState = model.EreadState.HEADER;
            }
        }
    }

    return resultList;
};
