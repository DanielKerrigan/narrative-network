function Network() {
    
    var margin = { top: 0, right: 30, bottom: 0, left: 30 };
    var width = 1000 - margin.left - margin.right;
    var height = 700 - margin.top - margin.bottom;
    var node_size = 35;
    var link_distance = 200;
    var num_sentences = 0;

    var network = function(selection) {
        selection.each(function(data, i){
            ext = d3.extent(data.links, function(a) { return +a.sentence; });
            min_sentence = ext[0];
            max_sentence = ext[1];
            var svg = selection.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate("+margin.left+","+margin.top+")");

            // marker for arrow that goes at the end of lines
            svg.append("defs").selectAll("marker")
                // different colors for sentiments
                .data(["positive", "neutral", "negative"])
                .enter()
                .append("marker")
                .attr("id", function(d) { return d + "-arrow"; })
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", node_size + 4)
                .attr("refY", -3.10)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M0,-5L10,0L0,5");

            links_group = svg.append("g").attr("class", "links");
            nodes_group = svg.append("g").attr("class", "nodes");
            
            // create new simulation and add forces to it
            var simulation = d3.forceSimulation()
                // force between connected nodes
                .force("link", d3.forceLink()
                                    .id(function(d) { return d.id })
                                    .distance(link_distance))
                // repulsive force between all nodes
                .force("charge", d3.forceManyBody().strength(-100))
                // prevent nodes from overlapping
                .force("collide", d3.forceCollide(node_size))
                // make center of mass be the center of the svg
                .force("center", d3.forceCenter(width/2, height/2))
                .on("tick", tick);
            
            
            function update(sentences) {
                d3.select("#sentence-number")
                    .text("Sentence: " + sentences + "/" + max_sentence);
                var filtered_nodes = data.nodes.filter(a => +a.sentence <= sentences);
                var filtered_edges = data.links.filter(a => +a.sentence <= sentences);
                // edges
                var link = links_group.selectAll(".edge")
                    .data(filtered_edges, d => d.source + d.verb + d.target);
                link.enter()
                    .append("path")
                    .attr("class", "edge")
                    .attr("id", function(d) { return "neutral-edge"; })
                    .attr("marker-end", function(d) {
                        return "url(#neutral-arrow)";
                    })
                    .merge(link);
                link.exit().remove();

                // edge labels
                var link_label = links_group.selectAll(".edge_label")
                    .data(filtered_edges, d => d.source + d.verb + d.target);
                link_label.enter()
                    .append("text")
                    .attr("class", "edge_label")
                    .attr("dy", "0.35em")
                    .text(function(d) {
                        return d.verb;
                    })
                    .merge(link_label);
                link_label.exit().remove();
                 
                // nodes
                var node = nodes_group.selectAll(".node")
                    .data(filtered_nodes, d => d.id);
                node.enter()
                    .append("circle")
                    .attr("class", function(d) {
                        var cls = "node";
                        if (d.type == "object") {
                            cls += " object";
                        } else if (d.team === "Cavaliers") {
                            cls += " cavs";
                        } else if (d.team === "Warriors") {
                            cls += " warriors";
                        }
                        return cls;
                    })
                    .attr("r", node_size)
                    .call(d3.drag()
                        .on("start", dragstarted)
                        .on("drag", dragged)
                        .on("end", dragended))
                    .merge(node);
                node.exit().remove();
                
                // node labels
                var node_label = nodes_group.selectAll(".node_label")
                    .data(filtered_nodes, d => d.id);
                node_label.enter()
                    .append("text")
                    .attr("class", "node_label")
                    .attr("dy", "0.35em")
                    .text(function(d) { return d.id; })
                    // change font size depending on length of text and size of node
                    .style("font-size", function(d) {
                        var size = Math.min(node_size-10, Math.max (10, (2 * node_size - 8) 
                            / this.getComputedTextLength() * 24)) + "px";
                        return size;
                    })
                    .call(wrap, (node_size-5)*2)
                    .merge(node_label);
                node_label.exit().remove();

                simulation.nodes(filtered_nodes);
                simulation.force("link").links(filtered_edges);
                simulation.alpha(1).restart();
            }
            
            // slider and button interactions
            var slider = d3.select("#slider");
            slider = slider.attr("min", min_sentence)
                .attr("max", max_sentence)
                .attr("value", max_sentence)
                .on("input", function() {
                    update(+this.value);
                });
            update(max_sentence);
            
            var plus_button = d3.select("#plus");
            plus_button = plus_button.on("click", function() {
                var value = Math.min(+slider.property("value") + 1, max_sentence);
                slider.property("value", value);
                update(value);
            });
            
            var minus_button = d3.select("#minus");
            minus_button = minus_button.on("click", function() {
                var value = Math.max(+slider.property("value") - 1, 0);
                slider.property("value", value);
                update(value);
            });
            
            // allow dragging a node to a fixed position
            function dragstarted(d) {
                if (!d3.event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            
            function dragged(d) {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            }
            
            function dragended(d) {
                if (!d3.event.active) simulation.alphaTarget(0);
                d.fx = d.x;
                d.fy = d.y;
            }

            // update the positions of the nodes, edges, and labels
            function tick() {
                // make an arc between the two nodes
                svg.selectAll(".edge")
                    .attr("d", function(d) {
                        // make the path between nodes be an arc
                        var dr = get_radius(d);
                        return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr +
                            " 0 0,1 " + d.target.x + "," + d.target.y;
                    });
    
                // put the labels in the middle of the arc
                svg.selectAll(".edge_label")
                    .attr("x", function(d) {
                        var point = get_arc_middle(d);
                        return point.x;
                    })
                    .attr("y", function(d) {
                        var point = get_arc_middle(d);
                        return point.y;
                    });
    
                // keep all nodes and their labels in the svg
                svg.selectAll(".node")
                    .attr("cx", function(d) { 
                        return d.x = Math.max(node_size, (Math.min(d.x, width - node_size)));
                    })
                    .attr("cy", function(d) {
                        return d.y = Math.max(node_size, (Math.min(d.y, height - node_size))); 
                    });
    
                svg.selectAll(".node_label")
                    .attr("x", function(d) { return d.x; })
                    .attr("y", function(d) { return d.y; })
                    .selectAll("tspan")
                    .attr("x", function(d) { return d.x; });

                // get the point on the arc that's halfway between the two nodes
                function get_arc_middle(d) {
                    var center = get_circle_center(d);
                    var rad_source = Math.atan2(d.source.y - center.y, d.source.x - center.x);
                    var rad_target = Math.atan2(d.target.y - center.y, d.target.x - center.x);
                    
                    var diff1 = Math.abs(rad_source - rad_target);
                    var diff2 = Math.PI*2 - diff1;
                    var diff = Math.min(diff1, diff2);
                    var rad_middle;

                    if (diff === diff1) {
                        rad_middle = Math.min(rad_source, rad_target) + diff/2;
                    } else {
                        rad_middle = Math.max(rad_source, rad_target) + diff/2;
                    }

                    var radius = get_radius(d);

                    var x = radius * Math.cos(rad_middle) + center.x;
                    var y = radius * Math.sin(rad_middle) + center.y;
                    
                    return {'x': x, 'y': y};
                }

                // get the center of the circle formed by the arc
                function get_circle_center(d) {
                    var x0 = d.source.x;
                    var x1 = d.target.x;
                    var dx = x1 - x0;

                    var y0 = d.source.y;
                    var y1 = d.target.y;
                    var dy = y1 - y0;
                    
                    var r = get_radius(d);
                    
                    var d = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
                    var u = dx / d;
                    var v = dy / d;
                    var h = Math.sqrt(Math.pow(r, 2) - Math.pow(d, 2)/4);

                    var a = ((x0 + x1) / 2) - h*v;
                    var b = ((y0 + y1) / 2) + h*u;

                    return {'x': a, 'y': b};
                }

                function get_radius(d) {
                    var dx = d.target.x - d.source.x;
                    var dy = d.target.y - d.source.y;
                    var radius = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                    return radius;
                }

            }
        });
    }
    
    return network;
}

// https://bl.ocks.org/mbostock/7555321
function wrap(text, width) {
  text.each(function(d) {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1, // ems
        y = d.y,
        x = d.x,
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("dy", dy + "em");
        first_tspan = tspan;

    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        lineNumber++;
        tspan = text.append("tspan").attr("dy", "1em").text(word);
      }
    }
      if (lineNumber > 0) {
        first_tspan.attr("dy", lineNumber * -0.25 + "em");
      }
  });
}
