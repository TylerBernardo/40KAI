export function pmax(a1: number[],a2: number[]) : number[]{
    return a1.map((value,index) => value > a2[index] ? value : a2[index])
}

export function pmin(a1:number[],a2:number[]):number[]{
    return a1.map((value,index) => value < a2[index] ? value : a2[index])
}

export function range(size:number, startAt: number = 0):number[] {
    return [...Array(size).keys()].map(i => i + startAt);
}

//console.log(pmin([1,2,3,4],[2,3,4,1]))
//console.log(pmax([1,2,3,4],[2,3,4,1]))

export function check_args_GPB(x,probs,val_p,val_q,wts,method){
    //check if x only contains integers x.reduce(((a,b) => a && (b - Math.round(b) != 0),true))
    if(x != null && !x.every((value)=>value - Math.round(value) != 0)){
        //x contains non-integers
        x = x.map((item,index)=>Math.floor(item))
    }

    //check if 'probs' contains only probabilities
    var isValid = probs.every((value) => value != null && !Number.isNaN(value))//probs.reduce(((a,b) => a && (b != null && b!= NaN),true))
    var isInRange = probs.every((value) => value >= 0 && value <= 1)//probs.reduce(((a,b) => a && (b >= 0 && b <= 1),true))
    if(!isValid || !isInRange){
        throw new Error("'probs' must contain real numbers between 0 and 1!")
    }
    //number of probabilities
    var n = probs.length

    //check if val_p and val_q have the same length
    if(val_p.length != n || val_q.length != n){
        throw new Error("'probs', 'val_p', and 'val_q' must have the same length!")
    }

    if(wts != null && wts.length != n){
        throw new Error("'probs' and 'wts' must have the same length")
    }

    //check if val_p and val_q contain only integers 
    var pIsInt = val_p.every((value)=>value - Math.round(value) == 0)
    var qIsInt = val_q.every((value)=>value - Math.round(value) == 0)
    if(!pIsInt){
        val_p = val_p.map((item,index)=>Math.floor(item))
    }
    if(!qIsInt){
        val_q = val_q.map((item,index)=>Math.floor(item))
    }

    //var wtsCheck = 
    if(wts != null && !wts.every((b) => (!Number.isNaN(b) && b >= 0 && Math.abs(b-Math.round(b)) <= Math.pow(10,-7)))){
        throw new Error("'wts' must contain non-negative integers")
    }

    if(!(["DivideFFT","Convolve","Characteristic","Normal","Refined Normal"].includes(method))){
        throw new Error("Method does nto exist")
    }

    return method
}

export function transformGPB(x,probs,val_p,val_q,wts){
    //number of probabilities
    var n = probs.length;
    //expand probs, val_p, and val_q acording to the counts in wts
    //if wts is null, set it to be a vector of ones
    if(wts == null){
        wts = new Array(n).fill(1)
    }

    //expand probs, val_p, val_q
    var newProbs: number[] = [], newP:number[] = [], newQ:number[] = []
    for(var i = 0; i < n; i++){
        newProbs = newProbs.concat(Array(wts[i]).fill(probs[i]))
        newP = newP.concat(Array(wts[i]).fill(val_p[i]))
        newQ = newQ.concat(Array(wts[i]).fill(val_q[i]))
    }
    probs = newProbs; 
    val_p = newP;
    val_q = newQ;

    //reorder val_p and val_q so that values in 'val_p' are always greater 
    var val_gr = pmax(val_p,val_q)
    var val_lo = pmin(val_p,val_q)
    probs = probs.map((value,index) => val_gr[index] > val_p[index] ? 1 - value : value)

    //recompute length of 'probs' (= sum of 'wts')
    n = wts.reduce((a,b) => a+b,0)

    //determine relevent range of observations
    //determine minimum and maximum possible observations
    var sum_min = val_lo.reduce((a,b)=>a+b,0)
    var sum_max = val_gr.reduce((a,b)=>a+b,0)

    //which probabilities are 0 or 1, which val_p and val_q are equal
    var idx0: number[] = [],idx1:number[] = [], idxv:number[] = [], idxr:number[] = []
    for(var i = 0; i < probs.length; i++){
        if(probs[i] == 0){
            idx0.push(i)
        }else if(probs[i] == 1){
            idx1.push(i)
        }else if(val_gr[i] == val_lo[i]){
            idxv.push(i)
        }else{
            idxr.push(i)
        }
    }
    //guaranteed
    var val_gr_sure = idx1.map((value,index) => val_gr[value])
    var val_lo_sure = idx0.map((value,index) => val_lo[value])
    var vals_equal = idxv.map((value,index) => val_gr[value])
    var sum_sure = val_gr_sure.reduce((a,b)=>a+b,0) + val_lo_sure.reduce((a,b)=>a+b,0) + vals_equal.reduce((a,b)=>a+b,0)
    // limit 'probs', 'val_p', and 'val_q' to relevant range
    var np = idxr.length
    if(np){
        probs = idxr.map((value,index) => probs[value])
        val_gr = idxr.map((value,index) => val_gr[value])
        val_lo = idxr.map((value,index) => val_lo[value])
    }else{
        probs = [1]
        val_gr = [0]
        val_lo = [0]
    }

    //compute differences and their gcd
    var diffs = val_gr.map((value,index) => value - val_lo[index])

    //bounds of relevent observations
    var sum_min_in = sum_sure + val_lo.reduce((a,b)=>a+b,0)
    var sum_max_in = sum_sure + val_gr.reduce((a,b)=>a+b,0)

    var toReturn = {
        "probs":probs,
        "val_p":val_gr,
        "val_q":val_lo,
        "compl_range":range(sum_max-sum_min+1,sum_min),
        "inner_range":range(sum_max_in-sum_min_in+1,sum_min_in),
        "inner_size":sum_max_in - sum_min_in + 1,
        "n":np,
        "diffs":diffs
    }

    return toReturn
}