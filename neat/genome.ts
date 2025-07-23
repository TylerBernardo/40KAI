const DISABLE_RATE = .75

export interface nodeGene{
    number:number;
    type:"Input" | "Output" | "Hidden" | "Bias";
    depth: number
}

export interface connectGene{
    in:number;
    out:number;
    weight:number;
    enabled:boolean;
    innovationNumber:number;
}

export class Genome{
    nodeGenes: nodeGene[];
    //sorted by innovationNumber
    connectGenes: connectGene[];

    constructor(){
        this.nodeGenes = []
        this.connectGenes = []
    }

    print(){
        //sort the nodeGenes by depth
        let sorted: nodeGene[] = this.nodeGenes.toSorted((a,b) => b.depth - a.depth)
        let toPrint: string = ""
        let currentDepth = 1
        for(let gene of sorted){
            if(gene.depth == currentDepth){
                toPrint += "(" + gene.number.toString() + ")     "
            }else{
                console.log(toPrint)
                currentDepth = gene.depth
                toPrint = "(" + gene.number.toString() + ")     "
            }
        }
        console.log(toPrint)
    }
}

function geneCompare(a: connectGene, b:connectGene){
    return a.innovationNumber - b.innovationNumber
}

export function crossover(p1:Genome,p2:Genome){
    let result: connectGene[] = [];
    //check which innovation numbers each parent has
    let p1Innovation: number[] = p1.connectGenes.map((value:connectGene) => value.innovationNumber);
    let p2Innovation: number[] = p2.connectGenes.map((value:connectGene) => value.innovationNumber);
    //iterate over p1's innovation numbers
    for(let i in p1Innovation){
        //check if p2 also has this innovation number
        if(p2Innovation.includes(p1Innovation[i])){
            //decide which of the two parent's version to use
            let toPush: connectGene;
            if(Math.random() > .5){
                toPush ={
                    in:p1.connectGenes[i].in,
                    out:p1.connectGenes[i].out,
                    weight:p1.connectGenes[i].weight,
                    enabled:true,
                    innovationNumber:p1.connectGenes[i].innovationNumber
                }
            }else{
                toPush ={
                    in:p2.connectGenes[i].in,
                    out:p2.connectGenes[i].out,
                    weight:p2.connectGenes[i].weight,
                    enabled:true,
                    innovationNumber:p2.connectGenes[i].innovationNumber
                }
            }
            //check whether it should be enabled or disabled
            if((!p1.connectGenes[i].enabled || !p2.connectGenes[i]) && Math.random() <= DISABLE_RATE){
                toPush.enabled = false;
            }   
            //push to the result list
            result.push(toPush)
        }else{
            //this is a disjoint/excess gene, accept it into the result
            result.push({
                in:p1.connectGenes[i].in,
                out:p1.connectGenes[i].out,
                weight:p1.connectGenes[i].weight,
                enabled:Math.random() <= DISABLE_RATE ? p1.connectGenes[i].enabled: true,
                innovationNumber:p1.connectGenes[i].innovationNumber
            })
        }
    }

    //iterate over p2's innovation numbers and add any that are not present in p1
    for(let i in p2Innovation){
        if(!p1Innovation.includes(p2Innovation[i])){
            //this is a disjoint/excess gene
            result.push({
                in:p2.connectGenes[i].in,
                out:p2.connectGenes[i].out,
                weight:p2.connectGenes[i].weight,
                enabled:Math.random() <= DISABLE_RATE ? p2.connectGenes[i].enabled: true,
                innovationNumber:p2.connectGenes[i].innovationNumber
            })
        }
    }
    //since the resulting genome may be out of order sort it by the gene's innovation number
    result = result.sort(geneCompare)
    //return the resulting genome
    return result;
}