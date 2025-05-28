//each entry in the array represents the sides of that dice. Returns an array of the results for each dice
function rollNSidedDice(diceArray: number[]): number[]{
    let output: number[] = Array(diceArray.length);
    for(var n in diceArray){
        output[n] = Math.round(Math.random() * (diceArray[n] - 1) + 1);
    }
    return output;
}

//roll "count" 6-sided dice
function multiD6(count : number): number[]{
    return rollNSidedDice(Array(count).fill(6));
}


//a dice class capable of rolling the result of any combination of dice
class Dice{
    //Example diceString: 2d6+3
    constantTerm: number = 0;
    dice: number[] = [];
    constructor(diceString: string){
        diceString = diceString.toLowerCase()
        //get each individual term of the expression
        let terms: string[] = diceString.split("+")
        for(var term of terms){
            //split it between the count of the dice and the sides of the dice
            let info: string[] = term.split('d');
            if(info.length == 1){
                //constant term
                this.constantTerm += parseInt(term,10);

            }else{
                //dice are being rolled
                if(info[0] == ''){
                    this.dice.push(parseInt(info[1],10));
                    continue;
                }
                for(var i = 0; i < parseInt(info[0],10); i++){
                    this.dice.push(parseInt(info[1],10));
                }
            }
        }
        //console.log(this.constantTerm)
        //console.log(this.dice);
    }
    //get the total sum of the results
    roll():number{
        return this.constantTerm + rollNSidedDice(this.dice).reduce((partialSum,a) => partialSum + a,0);
    }
}

export {
    multiD6,
    Dice
}