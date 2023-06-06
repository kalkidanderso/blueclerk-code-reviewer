/**
 * Common functions used on the endpoints version 2
 */

/**
 * Split array on arrays with specified length
 * @param array the original array
 * @param size the size to split the original arrar
 * @returns array of arrays
 */
const splitArray = (array: any[], size: number) => {
    let result = [];
    for (let i = 0; i < array.length; i += size) {
        let chunk = array.slice(i, i + size);
        result.push(chunk);
    }
    return result;
}

export {
    splitArray
}