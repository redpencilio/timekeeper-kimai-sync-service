export function joinAndEnd(theArray, delimiter) {
  if(theArray && theArray.length > 0) {
    return `${theArray.join(delimiter)}${delimiter}`;
  }else {
    return "";
  }
}

export default function ensureArray(value) {
  if (value == null) {
    return [];
  } else if (!Array.isArray(value)) {
    return [value];
  } else {
    return value;
  }
}
