import {Genome,nodeGene,connectGene,crossover} from "./genome"

class Agent{
    genome: Genome
    inputLength: number
    outputLength: number
    bias: number = 1
    constructor(genome: Genome, inputLength: number, outputLength: number){
        this.genome = genome
        this.inputLength = inputLength
        this.outputLength = outputLength
    }

    calculate(inputs: number[]): number[]{
        if(inputs.length != this.inputLength){
            throw new Error("Not enough inputs are present!")
        }
        //store the status of each node in the network
        let nodes = new Array(this.genome.nodeGenes.length).fill(0)
        //count how many enabled connections go to each 
        let connectionsLeft = new Array(nodes.length).fill(0)
        for(let connection of this.genome.connectGenes){
            connectionsLeft[connection.out - 1] += 1
        }
        //update the input nodes
        for(let i in inputs){
            nodes[i] = inputs[i]
        }
        //update the bias node
        nodes[inputs.length] = this.bias
        //store all the connection to process in a queue, at the start only enabled connections that start from an input/bias node are allowed
        let connectionQueue: connectGene[] = this.genome.connectGenes.filter((gene) => gene.enabled && 1 <= gene.in && gene.in <= this.inputLength+1)

        while(connectionQueue.length > 0){
            //pop off the front of the queue
            let connection: connectGene = <connectGene>connectionQueue.shift()
            //update the destination based on this connection 
            nodes[connection.out-1] += connection.weight * nodes[connection.in-1]
            connectionsLeft[connection.out - 1] -= 1
            if(connectionsLeft[connection.out - 1] == 0){
                //all the connections to this gene have been processed, add all connections that start at it to the queue
                //NOTE: If this implementation is too slow precompute which connections should be added for each node
                connectionQueue = connectionQueue.concat(this.genome.connectGenes.filter((gene)=> gene.enabled && gene.in == connection.out))
            }
        }
        //extract the output nodes and return them
        return nodes.slice(this.inputLength+1,this.inputLength+1+this.outputLength)
    }

    print():void{
        console.log("Node Genes:",this.genome.nodeGenes)
        console.log("Connect Genes", this.genome.connectGenes)
    }
}

class InnovationTracker{
    currentNumber: number = 0
    innovationMap: Map<string,number> = new Map();

    //get the innovation number for the connection between start node and end node, and assign it one if this is a new connection
    getNumber(startNode:number,endNode:number): number{
        let key: string = startNode.toString() + "->" + endNode.toString()
        let possibleNum: number | undefined = this.innovationMap.get(key)
        if(possibleNum){
            return possibleNum
        }else{
            this.currentNumber++
            this.innovationMap.set(key,this.currentNumber)
            return this.currentNumber
        }
    }
}

class AgentManager{
    innovationTracker: InnovationTracker = new InnovationTracker();
    inputLength: number
    outputLength: number
    populationSize: number

    constructor(inputLength: number, outputLength: number, populationSize:number){
        this.inputLength = inputLength
        this.outputLength = outputLength
        this.populationSize = populationSize
    }
    
    createAgent() : Agent{
        let newGenome = new Genome()
        let nodeNum = 1;
        //add input nodes
        for(let i = 0; i < this.inputLength; i++){
            newGenome.nodeGenes.push({number:nodeNum,type:"Input"})
            nodeNum++
        }
        //add the bias node
        newGenome.nodeGenes.push({number:nodeNum,type:"Bias"})
        nodeNum++
        //add the output nodes
        for(let i = 0; i < this.outputLength; i++){
            newGenome.nodeGenes.push({number:nodeNum,type:"Output"})
            nodeNum++
        }
        //connect all the input/bias nodes to the output and give them a random weight
        for(let inputIndex = 0; inputIndex <= this.inputLength; inputIndex++){
            //iterate over all the end nodes
            for(let outputIndex = this.inputLength+1; outputIndex < this.inputLength + this.outputLength + 1; outputIndex++){
                //add a connection that connects this input and output node
                newGenome.connectGenes.push({
                    in:newGenome.nodeGenes[inputIndex].number,
                    out:newGenome.nodeGenes[outputIndex].number,
                    weight:Math.random(),
                    enabled:true,
                    innovationNumber: this.innovationTracker.getNumber(newGenome.nodeGenes[inputIndex].number,newGenome.nodeGenes[outputIndex].number)
                })
            }
        }
        return new Agent(newGenome,this.inputLength,this.outputLength)
    }
}

//quick test

let testManager = new AgentManager(3,2,1);

let testAgent = testManager.createAgent()

//console.log(testAgent)
testAgent.print()
console.log(testAgent.calculate([1,1,1]))