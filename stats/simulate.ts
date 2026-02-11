import {Dice, multiD6} from "../gameEngine/dice.ts"

export var KEYWORDS = ["Sustained Hits 1", "Lethal Hits", "Reroll All Fails", "Reroll all non 6's", "Devastating Wounds"]

export function woundRoll(s:number,t:number): number{
    if(s >= 2 * t){
        return 2;
    }

    if(s > t){
        return 3;
    }

    if(s == t){
        return 4
    }

    if(s * 2 <= t){
        return 6
    }

    return 5;
}

function hitCount(diceResult:number, ws: number, keywords: string[]): number{
    let toReturn: number;
    let critical: boolean = false;
    if(keywords.includes("Reroll All Fails")){
        if(diceResult >= ws) {
            toReturn = 1;
            critical = diceResult == 6
        }else{
            //reroll fail
            let newResult: number = Math.floor(Math.random() * (6))+1;
            toReturn = newResult >= ws ? 1 : 0
            critical = newResult == 6
        }
    }else if(keywords.includes("Reroll all non 6's")){
        if(diceResult == 6) {
            toReturn = 1;
            critical = true
        }else{
            //reroll fail
            let newResult:number = Math.floor(Math.random() * (6))+1;
            toReturn = newResult >= ws ? 1 : 0
            critical = newResult == 6
        }
    }else{
        toReturn = diceResult >= ws ? 1 : 0
    }
    if(critical && keywords.includes("Sustained Hits 1")){
        toReturn *= 2
    }
    return toReturn
}

function woundCount(diceResult: number, toWound:number, keywords:string[]):number{
    return diceResult >= toWound ? 1 : 0
}

function damageCount(diceResult:number,save:number,damage:number|Dice,keywords:string[]):number{
    return diceResult >= save ? 0 : (damage instanceof Dice ? damage.rollSum() : damage)
}

export function simulate(ws:number,attacks:number,str:number,ap:number,dmg:number|Dice,save:number,toughness:number,keywords:string[]):number[]{
    let hitRolls: number[] = multiD6(attacks)
    let numHit6: number = hitRolls.reduce((a,b) => b == 6 ? a+1 : a, 0)
    let numHits: number = hitRolls.reduce((a,b) => a + hitCount(b,ws,keywords),0)
    //TODO: Current fails for rereollign with lethal hits. Refactor hitCount to return a flag for a critical hit and move logic for num hits outside of reduce
    if(keywords.includes("Lethal Hits")){
        numHits -= numHit6
    }

    let woundRolls: number[] = multiD6(numHits)
    let toWound: number = woundRoll(str,toughness)
    let numWound6: number = woundRolls.reduce((a,b) => b == 6 ? a+1 : a, 0)
    let numWounds: number = woundRolls.reduce((a,b) => a + woundCount(b,toWound,keywords),0)

    if(keywords.includes("Lethal Hits")){
        numWounds += numHit6
    }

    if(keywords.includes("Devastating Wounds")){
        numWounds -= numWound6
    }

    let saveThrows: number[] = multiD6(numWounds)
    save = Math.min(7,save + ap)
    //let numDamage: number = saveThrows.reduce((a,b) => a+damageCount(b,save,dmg,keywords),0)

    let damages: number[] = []

    for(let roll of saveThrows){
        let result = damageCount(roll,save,dmg,keywords);
        if(result > 0){
            damages.push(result)
        }
    }
    //add on dev wounds if needed
    if(keywords.includes("Devastating Wounds")){
        for(let i = 0; i < numWound6; i++){
            damages.push(dmg instanceof Dice ? dmg.rollSum() : dmg)
        }
    }

    return damages
}

export function aproximatePdf(ws:number,attacks:number,str:number,ap:number,dmg:number|Dice,save:number,toughness:number,keywords:string[], iterations:number): number[]{
    let results: number[];
    if(keywords.includes("Sustained Hits 1")){
        results = dmg instanceof Dice ? Array(dmg.max() * 2 * attacks + 1) : Array(dmg * 2 * attacks+1).fill(0)
    }else{
        results = dmg instanceof Dice ? Array(dmg.max() * attacks + 1) : Array(dmg * attacks+1).fill(0)
    }
    for(let i = 0; i < iterations; i++){
        let result: number = simulate(ws,attacks,str,ap,dmg,save,toughness,keywords).reduce((a,b) => a+b,0)
        results[result] += 1/iterations
    }
    return results
}