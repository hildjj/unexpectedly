import {parse} from '../testFile.peg.js';

export default text => parse(text).tests;
