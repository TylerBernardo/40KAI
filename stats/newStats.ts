//const FFT = require('fft.js');

//const f = new FFT(4096);
import { create, all, Complex } from 'mathjs'
// create a mathjs instance
const math = create(all)
const parser = math.parser()
let h = 6
let n = 5
parser.evaluate('n = ' + n)
parser.evaluate('h = ' + h)
parser.evaluate('f(t) = pow((11/36) pow(e,2t) + ((30-5*h)/36) pow(e,t) + (5*h-5)/36,n)')
parser.evaluate('k = 1')
parser.evaluate('m(t) = (f(i*t) * pow(e,-i*k*t))/(2 * pi)')
let m = (t) => parser.evaluate('m('+t+')')
console.log(parser.evaluate('f(1)'))
console.log()

function integrate(f,a,b,n): Complex{
    let delta = (b-a)/n
    let result = math.multiply(f(a),delta)
    for(let x = a + delta; x < b; x += delta){
        result = math.add(result, math.multiply(f(x),delta))
    }
    return <Complex><unknown>result
}

function fourierInversion(k){
    parser.evaluate('k = ' + k)
    return integrate(m,0,2 * Math.PI, 5500)
}
let test;
console.time('single')
test = fourierInversion(1).re
console.timeEnd('single')
console.time('full')
let p = Array(11).fill(0).map((value,index)=> fourierInversion(index).re)
console.timeEnd('full')
console.log(p)
console.log(p.reduce((value,current) => value + current,0))
