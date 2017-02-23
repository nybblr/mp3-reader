let { TextDecoder } = require('text-encoding');
let fs = require('fs');

let decode = (format, string) => new TextDecoder(format).decode(string);

let synchToInt = synch => {
  const mask = 0b01111111;
  let b1 = synch & mask;
  let b2 = (synch >> 8) & mask;
  let b3 = (synch >> 16) & mask;
  let b4 = (synch >> 24) & mask;

  return b1 | (b2 << 7) | (b3 << 14) | (b4 << 21);
};

const HEADER_SIZE = 10;
const ID3_ENCODINGS = [
  'ascii',
  'utf-16',
  'utf-16be',
  'utf-8'
];

const file = process.argv[2];

fs.readFile(file, (_, { buffer }) => {
  let header = new DataView(buffer, 0, HEADER_SIZE);

  let major = header.getUint8(3);
  let minor = header.getUint8(4);
  let version = `ID3v2.${major}.${minor}`;
  console.log(version);

  let size = synchToInt(header.getUint32(6));

  let offset = HEADER_SIZE;
  let id3Size = HEADER_SIZE + size;

  while (offset < id3Size) {
    let frame = decodeFrame(buffer, offset);
    if (!frame) { break; }
    console.log(`${frame.id}: ${frame.value.length > 200 ? '...' : frame.value}`);
    offset = offset + frame.size;
  }
});

let decodeFrame = (buffer, offset) => {
  let id = decode('ascii', new Uint8Array(buffer, offset, 4));
  if (id === '\0\0\0\0') { return; }

  let view = new DataView(buffer, offset, HEADER_SIZE + 1);

  let size = view.getUint32(4);
  let contentSize = size - 1;
  let encoding = view.getUint8(HEADER_SIZE);

  let contentOffset = offset + HEADER_SIZE + 1;

  let lang = decode('ascii',
    new Uint8Array(buffer, contentOffset, 3));

  if (lang.match(/^[a-z]+$/)) {
    contentOffset = contentOffset + 3;
    contentSize = contentSize - 3;
  }

  let value = decode(ID3_ENCODINGS[encoding],
    new Uint8Array(buffer, contentOffset, contentSize));

  return {
    id, value, lang,
    size: size + HEADER_SIZE
  };
};
