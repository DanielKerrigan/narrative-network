var network = new Network();

d3.json("data/full-story.json", function(data) {
    d3.select("#vis")
        .datum(data)
        .call(network);
});
