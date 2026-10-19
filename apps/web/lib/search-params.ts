/** The first value of a search parameter that may repeat, as in `?q=a&q=b`. */
export function singleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
