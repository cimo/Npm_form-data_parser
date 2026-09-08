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

const parameterRead = (value: string): Record<string, string> => {
    const resultObject: Record<string, string> = {};

    const partList: string[] = [];

    let part = "";
    let isQuote = false;

    for (let a = 0; a < value.length; a++) {
        const character = value[a];

        if (character === '"') {
            isQuote = !isQuote;

            part += character;
        } else if (character === ";" && !isQuote) {
            partList.push(part);

            part = "";
        } else {
            part += character;
        }
    }

    partList.push(part);

    for (let a = 0; a < partList.length; a++) {
        const separatorIndex = partList[a].indexOf("=");

        if (separatorIndex === -1) {
            continue;
        }

        const label = partList[a].slice(0, separatorIndex).trim().toLowerCase();

        let content = partList[a].slice(separatorIndex + 1).trim();

        if (content.length > 1 && content.startsWith('"') && content.endsWith('"')) {
            content = content.slice(1, -1);
        }

        resultObject[label] = content;
    }

    return resultObject;
};

const processData = (header: model.Iheader): model.Iinput => {
    const resultObject = {} as model.Iinput;

    const parameterObject = parameterRead(header.contentDisposition);

    const name = parameterObject["name"] ? parameterObject["name"] : "";
    const buffer = Buffer.from(header.byteList);
    const fileName = parameterObject["filename"] ? parameterObject["filename"] : "";

    propertyDefine(resultObject, "name", name);

    propertyDefine(resultObject, "buffer", buffer);

    if (fileName) {
        propertyDefine(resultObject, "fileName", fileName);

        const mimeType = header.contentType.split(":")[1] ? header.contentType.split(":")[1].trim() : "";
        propertyDefine(resultObject, "mimeType", mimeType);

        const size = Buffer.byteLength(buffer).toString();
        propertyDefine(resultObject, "size", size);
    }

    return resultObject;
};

export const readInput = (buffer: Buffer, contentType: string | undefined): model.Iinput[] => {
    const resultList: model.Iinput[] = [];

    if (contentType) {
        const boundary = parameterRead(contentType)["boundary"];

        if (!boundary) {
            return resultList;
        }

        let line = "";
        let lineByteList: number[] = [];
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

                if (readState !== model.EreadState.DATA) {
                    lineByteList.push(byte);
                }
            }

            if (characterReturn && readState === model.EreadState.INIT) {
                if (line == "--" + boundary) {
                    readState = model.EreadState.HEADER;
                }

                line = "";
                lineByteList = [];
            } else if (characterReturn && readState === model.EreadState.HEADER) {
                if (line.length) {
                    headerInputList.push(Buffer.from(lineByteList).toString("utf8"));
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
                lineByteList = [];
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
