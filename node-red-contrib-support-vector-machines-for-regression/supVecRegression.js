module.exports = function(RED) {
    function SupVecRegressionNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {
            var dividend = 0;
            var divisor = 0;
    
            // if (msg.topic == 'dividend')
            // {
            //     dividend = msg.payload
            //     context.set('dividend', dividend)
            //     divisor = context.get('divisor')
            // }
            // else if (msg.topic == 'divisor')
            // {
            //     divisor = msg.payload
            //     context.set('divisor', divisor)
            //     dividend = context.get('dividend')
            // }
            // var newMsg = { payload:(dividend/divisor) };
            // return ["port 0 ", newMsg , "port 2"];
        
            // msg.payload = msg.payload.toLowerCase();
            // node.send(msg);
            
          // return {payload:(msg.payload.dividend/msg.payload.divisor)}
           //return msg.payload.debug;
           if (msg.topic === "hello") {
            return [ msg, "port 1 vide" , "port 2 vide"];
         } else     if (msg.topic === "hi") {
            return ["port 0 vide" , msg,  "port 2 vide"];
         }else
         return ["port 0 vide" , "port 1 vide", msg];
        });
     
            }
            RED.nodes.registerType("supVecRegression", SupVecRegressionNode);
        }