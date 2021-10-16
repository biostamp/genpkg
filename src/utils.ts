import { homedir } from 'os'

/**
 * Checks if the given value is a path to a local file.
 *
 * @param p Path reference to a file.
 * @returns Returns true if the path is to a local file.
 */
export const isLocalPath = (p: string): boolean => /^[./]|(^[A-Za-z]:)/.test(p)

/**
 * Global path to template dir
 */
export const TEMPLATE_DIR = `${homedir()}/.biostamp/templates`

/**
 * Append default main branch to the given path unless another branch
 * was provided.
 *
 * @param tp Default repo path.
 * @returns {string} Returns the default repo path.
 */
export const addDefaultBranch = (tp: string): string => tp.includes('#') ? tp : `${tp}#main`
