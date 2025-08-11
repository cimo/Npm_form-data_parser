export interface Iinput {
    name: string;
    buffer: Buffer;
    filename: string;
    mimeType: string;
    size: string;
}

export interface Iheader {
    contentDisposition: string;
    contentType: string;
    byteList: number[];
}

export enum EreadState {
    INIT,
    HEADER,
    DATA,
    SEPARATOR
}
