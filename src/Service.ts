// Source
import * as model from "./Model";

const createObject = (input: model.Iinput, label: string, value: Buffer | Record<string, number> | string | number): void => {
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
        const name = contentDispositionSplit[1] ? contentDispositionSplit[1].split("=")[1].replace(/"/g, "").trim() : "";
        const buffer = Buffer.from(header.byteList);
        const filename = contentDispositionSplit[2] ? contentDispositionSplit[2].split("=")[1].trim() : "";

        createObject(resultObject, "name", name);

        createObject(resultObject, "buffer", buffer);

        if (filename) {
            const byteObject: Record<string, number> = JSON.parse(filename);
            createObject(resultObject, "filename", byteObject);

            const mimeType = header.contentType.split(":")[1] ? header.contentType.split(":")[1].trim() : "";
            createObject(resultObject, "mimeType", mimeType);

            const size = Buffer.byteLength(buffer);
            createObject(resultObject, "size", size);
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

                    for (const b of headerInputList) {
                        if (b.toLowerCase().startsWith("content-disposition:")) {
                            headerContentDisposition = b;
                        } else if (b.toLowerCase().startsWith("content-type:")) {
                            headerContentType = b;
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
