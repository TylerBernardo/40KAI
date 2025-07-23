import {Genome,nodeGene,connectGene,crossover} from "./genome"

class Agent{
    genome: Genome
    inputLength: number
    outputLength: number
    bias: number = 1
    fitness: number;
    nextNode: number;
    constructor(genome: Genome, inputLength: number, outputLength: number){
        this.genome = genome
        this.inputLength = inputLength
        this.outputLength = outputLength
        this.nextNode = this.genome.nodeGenes.length + 1
    }

    calculate(inputs:number[]): number[]{
        if(inputs.length != this.inputLength){
            throw new Error("Not enough inputs are present!")
        }
        //sort the nodes based on depth
        let sortedNodeIndicies: number[] = [...this.genome.nodeGenes.keys()].toSorted((a,b) => this.genome.nodeGenes[a].depth - this.genome.nodeGenes[b].depth)
        //let sortedNodes: nodeGene[] = sortedNodeIndicies.map((value) => this.genome.nodeGenes[value])
        //sort the connections based on when their in node appears in the network
        let sortedConnections: connectGene[] = this.genome.connectGenes.toSorted((a,b) => sortedNodeIndicies.indexOf(a.in-1) - sortedNodeIndicies.indexOf(b.in-1))
        //store the status of each node in the network
        let nodes = new Array(this.genome.nodeGenes.length).fill(0)
        //update the input nodes
        for(let i in inputs){
            nodes[i] = inputs[i]
        }
        //update the bias node
        nodes[inputs.length] = this.bias
        for(let connection of sortedConnections){
            if(connection.enabled){
                nodes[connection.out-1] += connection.weight * nodes[connection.in-1]
            }
             
        }
        //extract the output nodes and return them
        return nodes.slice(this.inputLength+1,this.inputLength+1+this.outputLength)
    }

    print():void{
        console.log("Node Genes")
        this.genome.print()
        //console.log("Node Genes:",this.genome.nodeGenes)
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
            newGenome.nodeGenes.push({number:nodeNum,type:"Input",depth:0})
            nodeNum++
        }
        //add the bias node
        newGenome.nodeGenes.push({number:nodeNum,type:"Bias",depth:0})
        nodeNum++
        //add the output nodes
        for(let i = 0; i < this.outputLength; i++){
            newGenome.nodeGenes.push({number:nodeNum,type:"Output",depth:1})
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

    //add a node to the given agent's genome
    mutateAddNode(toMutate: Agent): void{
        //pick a random connection
        let randomIndex = Math.floor(Math.random() * toMutate.genome.connectGenes.length)
        //console.log(randomIndex)
        let connection = toMutate.genome.connectGenes[randomIndex]
        //create the new node
        toMutate.genome.nodeGenes.push({
            number:toMutate.nextNode,
            type:"Hidden",
            //average the two depth values together
            depth: (toMutate.genome.nodeGenes[connection.in-1].depth + toMutate.genome.nodeGenes[connection.out-1].depth)/2
        })
        
        //create two new connections
        toMutate.genome.connectGenes.push({
            in:connection.in,
            out:toMutate.nextNode,
            weight:Math.random(),
            enabled:true,
            innovationNumber: this.innovationTracker.getNumber(connection.in,toMutate.nextNode)
        })

        toMutate.genome.connectGenes.push({
            in:toMutate.nextNode,
            out: connection.out,
            weight:Math.random(),
            enabled:true,
            innovationNumber: this.innovationTracker.getNumber(toMutate.nextNode,connection.out)
        })
        //disable the old connection
        toMutate.genome.connectGenes[randomIndex].enabled = false

        toMutate.nextNode++
    }

    mutateAddConnection(toMutate: Agent): void{
        //pick a starting point for the connection, it should be an input or hidden node
        let possibleInNodes: nodeGene[] =  toMutate.genome.nodeGenes.filter((gene) => gene.depth < 1)
        let inIndex: number = Math.floor(Math.random() * possibleInNodes.length)
        

        
        //calculate which nodes already have a connection from this node
        let usedNumbers: number[] = toMutate.genome.connectGenes.filter((gene)=> gene.in == possibleInNodes[inIndex].number).map((gene)=> gene.out)
        //pick a node with a greater depth that does not have a connection to this node
        let possibleOutNodes: nodeGene[] = toMutate.genome.nodeGenes.filter((gene) => gene.depth > possibleInNodes[inIndex].depth && !usedNumbers.includes(gene.number))
        if(possibleOutNodes.length == 0){
           // console.log("No possible connections")
            return
        }
        let outIndex: number = Math.floor(Math.random() * possibleOutNodes.length)

        toMutate.genome.connectGenes.push({
            in: possibleInNodes[inIndex].number,
            out: possibleOutNodes[outIndex].number,
            weight:Math.random(),
            enabled:true,
            innovationNumber: this.innovationTracker.getNumber(possibleInNodes[inIndex].number,possibleOutNodes[outIndex].number)
        })
    }

}

//quick test

let testManager = new AgentManager(3,2,1);

let testAgent = testManager.createAgent()
for(let i = 0; i < 10; i++){
    testManager.mutateAddNode(testAgent)
    testManager.mutateAddConnection(testAgent)
}


//console.log(testAgent)
//testAgent.print()
testAgent.genome.print()

console.log(testAgent.calculate([1,1,1]))

