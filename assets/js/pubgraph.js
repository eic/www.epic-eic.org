/* Interactive publication / reference graph for /public/publications.html
 *
 * Reads the JSON written at build time by tools/inspire_graph.py and draws it
 * as a d3-force directed graph in SVG.  Three node classes:
 *
 *   collaboration  ePIC collaboration paper      (from _data/publications.yml)
 *   collaborator   ePIC collaborator paper       (from _data/publications.yml)
 *   external       cited by more than `threshold` of the above
 *
 * Everything from InspireHEP -- titles, author strings, collaboration names --
 * is untrusted text and is inserted with textContent, never innerHTML.
 *
 * Requires d3 v7, loaded by the page.
 */
(function () {
  "use strict";

  /* Categorical slots 1-3 of the validated light-mode palette.  Checked with
   * the all-pairs rule (a network puts arbitrary classes side by side): worst
   * CVD dE 9.2, worst normal-vision dE 24.0 against a white surface.  The
   * aqua slot sits below 3:1 contrast, so external nodes are always directly
   * labelled and every node is repeated in the table below the graph. */
  var COLOR = {
    collaboration: "#2a78d6",
    collaborator: "#eb6834",
    external: "#1baf7a"
  };

  var GROUP_NAME = {
    collaboration: "ePIC collaboration paper",
    collaborator: "ePIC collaborator paper",
    external: "Cited by ePIC publications"
  };

  var GROUP_ORDER = ["collaboration", "collaborator", "external"];

  var WIDTH = 1000;
  var HEIGHT = 640;

  var root = document.getElementById("pubgraph");
  if (!root) {
    return;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined && text !== null) {
      node.textContent = String(text);
    }
    return node;
  }

  function message(text) {
    var box = root.querySelector(".pubgraph-status");
    if (!box) {
      box = el("p", "pubgraph-status");
      root.appendChild(box);
    }
    box.textContent = text;
  }

  if (typeof window.d3 === "undefined") {
    message("The graph could not be drawn: the d3 library failed to load.");
    return;
  }

  var source = root.getAttribute("data-src");
  if (!source) {
    message("The graph is not configured: no data source was given.");
    return;
  }

  fetch(source, { credentials: "same-origin" })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    })
    .then(draw)
    .catch(function () {
      message(
        "The publication graph has not been generated yet. Run " +
          "tools/inspire_graph.py to build it, or see the publication list below."
      );
    });

  /* ---------------------------------------------------------------- render */

  function draw(data) {
    var nodes = (data && data.nodes) || [];
    var links = (data && data.links) || [];

    if (!nodes.length) {
      message(
        "No publications are configured yet. Add InspireHEP keys to " +
          "_data/publications.yml to populate this graph."
      );
      return;
    }

    root.innerHTML = "";

    var byId = {};
    nodes.forEach(function (node) {
      byId[node.id] = node;
    });
    // Drop any edge whose endpoints are not both drawn.
    links = links.filter(function (link) {
      return byId[link.source] && byId[link.target];
    });

    var neighbours = {};
    nodes.forEach(function (node) {
      neighbours[node.id] = {};
      neighbours[node.id][node.id] = true;
    });
    links.forEach(function (link) {
      neighbours[link.source][link.target] = true;
      neighbours[link.target][link.source] = true;
    });

    var maxDegree = d3.max(nodes, function (node) {
      return node.in_degree || 0;
    }) || 1;
    var radius = d3
      .scaleSqrt()
      .domain([0, maxDegree])
      .range([6, 26]); // >= 8px across at the smallest

    root.appendChild(buildControls(data, nodes));

    var figure = el("div", "pubgraph-figure");
    root.appendChild(figure);

    var tooltip = el("div", "pubgraph-tooltip");
    tooltip.setAttribute("role", "status");
    tooltip.hidden = true;
    figure.appendChild(tooltip);

    var svg = d3
      .select(figure)
      .append("svg")
      .attr("class", "pubgraph-svg")
      .attr("viewBox", "0 0 " + WIDTH + " " + HEIGHT)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("role", "img")
      .attr("aria-label", summary(data, nodes, links));

    // Arrowheads: one per class so the head matches the edge it terminates.
    var defs = svg.append("defs");
    GROUP_ORDER.forEach(function (group) {
      defs
        .append("marker")
        .attr("id", "pubgraph-arrow-" + group)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4L9,0L0,4")
        .attr("class", "pubgraph-arrowhead");
    });

    var viewport = svg.append("g");

    var link = viewport
      .append("g")
      .attr("class", "pubgraph-links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "pubgraph-link")
      .attr("marker-end", function (d) {
        return "url(#pubgraph-arrow-" + byId[d.target].group + ")";
      });

    var node = viewport
      .append("g")
      .attr("class", "pubgraph-nodes")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "pubgraph-node")
      .attr("tabindex", 0)
      .attr("role", "link")
      .attr("aria-label", function (d) {
        return describe(d);
      });

    // Transparent hit area: the painted circle is far smaller than the ~24px
    // a pointer or a coarse touch target can reliably land on.
    node
      .append("circle")
      .attr("class", "pubgraph-hit")
      .attr("r", function (d) {
        return Math.max(radius(d.in_degree || 0) + 6, 14);
      });

    node
      .append("circle")
      .attr("class", function (d) {
        return "pubgraph-dot pubgraph-dot-" + d.group;
      })
      .attr("r", function (d) {
        return radius(d.in_degree || 0);
      })
      .attr("fill", function (d) {
        return COLOR[d.group];
      });

    node.append("title").text(function (d) {
      return describe(d);
    });

    /* External nodes are the hubs, and their colour is the one slot below 3:1
     * contrast -- so they are always labelled.  Primaries are labelled on
     * hover, focus and filter match only, or the graph turns into a wall of
     * text. */
    var label = node
      .append("text")
      .attr("class", "pubgraph-label")
      .attr("text-anchor", "middle")
      .attr("dy", function (d) {
        return -radius(d.in_degree || 0) - 6;
      })
      .text(function (d) {
        return d.label || d.texkey || d.id;
      })
      .classed("is-persistent", function (d) {
        return d.group === "external";
      });

    var simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id(function (d) {
            return d.id;
          })
          .distance(120)
          .strength(0.35)
      )
      .force("charge", d3.forceManyBody().strength(-420))
      .force("center", d3.forceCenter(WIDTH / 2, HEIGHT / 2))
      .force(
        "collide",
        d3.forceCollide().radius(function (d) {
          return radius(d.in_degree || 0) + 14;
        })
      )
      .on("tick", tick)
      .on("end", fitToView);

    function tick() {
      link
        .attr("x1", function (d) {
          return d.source.x;
        })
        .attr("y1", function (d) {
          return d.source.y;
        })
        .attr("x2", function (d) {
          return edgeX(d);
        })
        .attr("y2", function (d) {
          return edgeY(d);
        });
      node.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      });
    }

    // Stop the edge on the target's rim so the arrowhead is not buried.
    function edgeOffset(d) {
      var dx = d.target.x - d.source.x;
      var dy = d.target.y - d.source.y;
      var distance = Math.sqrt(dx * dx + dy * dy) || 1;
      return {
        dx: dx / distance,
        dy: dy / distance,
        r: radius(d.target.in_degree || 0) + 3
      };
    }
    function edgeX(d) {
      var o = edgeOffset(d);
      return d.target.x - o.dx * o.r;
    }
    function edgeY(d) {
      var o = edgeOffset(d);
      return d.target.y - o.dy * o.r;
    }

    /* ------------------------------------------------------------- zoom */

    var zoom = d3
      .zoom()
      .scaleExtent([0.2, 6])
      .on("zoom", function (event) {
        viewport.attr("transform", event.transform);
        scaleLabels(event.transform.k);
      });

    function scaleLabels(k) {
      label
        .style("font-size", 11 / k + "px")
        .style("stroke-width", 3 / k);
    }
    svg.call(zoom);

    /* Scale and centre the laid-out graph so it fills the frame, whether it
     * holds eight nodes or eighty. */
    function fitToView(duration) {
      var visible = nodes.filter(function (d) {
        return d.__visible !== false;
      });
      if (!visible.length) {
        return;
      }
      var pad = 46;
      var xs = d3.extent(visible, function (d) { return d.x; });
      var ys = d3.extent(visible, function (d) { return d.y; });
      var w = Math.max(xs[1] - xs[0], 1);
      var h = Math.max(ys[1] - ys[0], 1);
      var scale = Math.min(
        (WIDTH - 2 * pad) / w,
        (HEIGHT - 2 * pad) / h,
        2.2
      );
      var transform = d3.zoomIdentity
        .translate(WIDTH / 2, HEIGHT / 2)
        .scale(scale)
        .translate(-(xs[0] + w / 2), -(ys[0] + h / 2));
      var target = typeof duration === "number" ? svg.transition().duration(duration) : svg;
      target.call(zoom.transform, transform);
    }

    root.querySelector(".pubgraph-reset").addEventListener("click", function () {
      fitToView(400);
    });

    /* ------------------------------------------------- hover / focus /click */

    node
      .call(
        d3
          .drag()
          .on("start", function (event, d) {
            if (!event.active) {
              simulation.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", function (event, d) {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", function (event, d) {
            if (!event.active) {
              simulation.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
          })
      )
      .on("mouseenter", function (event, d) {
        highlight(d);
        showTooltip(event, d);
      })
      .on("mousemove", function (event, d) {
        showTooltip(event, d);
      })
      .on("mouseleave", clear)
      .on("focus", function (event, d) {
        highlight(d);
        showTooltip(event, d);
      })
      .on("blur", clear)
      .on("click", function (event, d) {
        open(d);
      })
      .on("keydown", function (event, d) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(d);
        }
      });

    function open(d) {
      if (d.url) {
        window.open(d.url, "_blank", "noopener");
      }
    }

    function highlight(active) {
      node.classed("is-dimmed", function (d) {
        return !neighbours[active.id][d.id];
      });
      node.classed("is-active", function (d) {
        return d.id === active.id;
      });
      link.classed("is-dimmed", function (d) {
        return d.source.id !== active.id && d.target.id !== active.id;
      });
      link.classed("is-active", function (d) {
        return d.source.id === active.id || d.target.id === active.id;
      });
      label.classed("is-shown", function (d) {
        return !!neighbours[active.id][d.id];
      });
    }

    function clear() {
      node.classed("is-dimmed", false).classed("is-active", false);
      link.classed("is-dimmed", false).classed("is-active", false);
      label.classed("is-shown", false);
      tooltip.hidden = true;
      applyFilter();
    }

    function showTooltip(event, d) {
      tooltip.innerHTML = "";

      var head = el("div", "pubgraph-tip-title", d.title);
      tooltip.appendChild(head);

      var meta = [];
      if (d.authors) {
        meta.push(d.authors);
      }
      if (d.year) {
        meta.push(String(d.year));
      }
      if (meta.length) {
        tooltip.appendChild(el("div", "pubgraph-tip-meta", meta.join(" · ")));
      }

      var stats = el("div", "pubgraph-tip-stats");
      var key = el("span", "pubgraph-tip-key");
      key.style.backgroundColor = COLOR[d.group];
      stats.appendChild(key);
      stats.appendChild(el("span", "pubgraph-tip-group", GROUP_NAME[d.group]));
      tooltip.appendChild(stats);

      if (typeof d.citations === "number") {
        tooltip.appendChild(
          el(
            "div",
            "pubgraph-tip-count",
            d.citations.toLocaleString() + " citations on InspireHEP"
          )
        );
      }
      tooltip.appendChild(el("div", "pubgraph-tip-count", citedBy(d)));

      tooltip.hidden = false;

      var bounds = root.getBoundingClientRect();
      var x = (event.clientX || bounds.left + bounds.width / 2) - bounds.left;
      var y = (event.clientY || bounds.top + bounds.height / 2) - bounds.top;
      var width = tooltip.offsetWidth;
      tooltip.style.left =
        Math.max(8, Math.min(x + 16, bounds.width - width - 8)) + "px";
      tooltip.style.top = Math.max(8, y + 16) + "px";
    }

    /* ------------------------------------------------------------ filtering */

    var search = root.querySelector(".pubgraph-search");
    var showExternal = root.querySelector(".pubgraph-show-external");
    var count = root.querySelector(".pubgraph-count");

    function matches(d, term) {
      if (!term) {
        return true;
      }
      var haystack = [d.title, d.texkey, d.authors, d.year, d.collaboration]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.indexOf(term) !== -1;
    }

    function applyFilter() {
      var term = (search.value || "").trim().toLowerCase();
      var withExternal = showExternal.checked;
      var visible = 0;

      node.classed("is-hidden", function (d) {
        var shown = (withExternal || d.group !== "external") && matches(d, term);
        if (shown) {
          visible += 1;
        }
        d.__visible = shown;
        return !shown;
      });
      link.classed("is-hidden", function (d) {
        return !(d.source.__visible && d.target.__visible);
      });
      label.classed("is-shown", function (d) {
        return !!term && d.__visible;
      });

      count.textContent =
        visible === nodes.length
          ? nodes.length + " publications shown"
          : visible + " of " + nodes.length + " publications shown";
      renderTable(term, withExternal);
    }

    search.addEventListener("input", applyFilter);
    showExternal.addEventListener("change", applyFilter);

    /* --------------------------------------------------- the table-view twin */

    var table = document.getElementById("pubgraph-table");

    function renderTable(term, withExternal) {
      if (!table) {
        return;
      }
      var body = table.querySelector("tbody");
      body.innerHTML = "";

      nodes
        .filter(function (d) {
          return (withExternal || d.group !== "external") && matches(d, term);
        })
        .sort(function (a, b) {
          return (b.year || 0) - (a.year || 0) || (b.in_degree || 0) - (a.in_degree || 0);
        })
        .forEach(function (d) {
          var row = document.createElement("tr");

          var titleCell = document.createElement("td");
          var anchor = document.createElement("a");
          anchor.href = d.url;
          anchor.target = "_blank";
          anchor.rel = "noopener";
          anchor.textContent = d.title;
          titleCell.appendChild(anchor);
          if (d.authors) {
            titleCell.appendChild(document.createElement("br"));
            titleCell.appendChild(el("small", null, d.authors));
          }
          row.appendChild(titleCell);

          row.appendChild(el("td", null, d.year || ""));

          var groupCell = document.createElement("td");
          var swatch = el(
            "span",
            d.group === "external" ? "pubgraph-swatch is-external" : "pubgraph-swatch"
          );
          swatch.style.backgroundColor = COLOR[d.group];
          swatch.style.color = COLOR[d.group];
          groupCell.appendChild(swatch);
          groupCell.appendChild(document.createTextNode(GROUP_NAME[d.group]));
          row.appendChild(groupCell);

          row.appendChild(el("td", null, d.in_degree));
          row.appendChild(
            el("td", null, typeof d.citations === "number" ? d.citations : "")
          );

          body.appendChild(row);
        });

      table.hidden = false;
    }

    applyFilter();
  }

  /* --------------------------------------------------------------- chrome */

  function buildControls(data, nodes) {
    var bar = el("div", "pubgraph-controls");

    var search = document.createElement("input");
    search.type = "search";
    search.className = "pubgraph-search form-control";
    search.placeholder = "Filter by title, author or year";
    search.setAttribute("aria-label", "Filter publications");
    bar.appendChild(search);

    var toggleWrap = el("label", "pubgraph-toggle");
    var toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "pubgraph-show-external";
    toggle.checked = true;
    toggleWrap.appendChild(toggle);
    toggleWrap.appendChild(
      document.createTextNode(
        " Show works cited by more than " + (data.threshold || 5) + " of them"
      )
    );
    bar.appendChild(toggleWrap);

    var reset = el("button", "pubgraph-reset btn btn-sm btn-outline-secondary", "Reset view");
    reset.type = "button";
    bar.appendChild(reset);

    bar.appendChild(el("span", "pubgraph-count", nodes.length + " publications shown"));

    var legend = el("div", "pubgraph-legend");
    legend.setAttribute("role", "list");
    GROUP_ORDER.forEach(function (group) {
      if (
        !nodes.some(function (node) {
          return node.group === group;
        })
      ) {
        return;
      }
      var item = el("span", "pubgraph-legend-item");
      item.setAttribute("role", "listitem");
      var key = el("span", "pubgraph-key pubgraph-key-" + group);
      key.style.backgroundColor = COLOR[group];
      item.appendChild(key);
      item.appendChild(document.createTextNode(GROUP_NAME[group]));
      legend.appendChild(item);
    });

    var wrapper = el("div", "pubgraph-chrome");
    wrapper.appendChild(bar);
    wrapper.appendChild(legend);
    if (data.generated) {
      wrapper.appendChild(
        el("p", "pubgraph-generated", "InspireHEP data retrieved " + formatDate(data.generated))
      );
    }
    return wrapper;
  }

  function formatDate(iso) {
    var when = new Date(iso);
    if (isNaN(when.getTime())) {
      return iso;
    }
    return when.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function citedBy(d) {
    return d.in_degree === 1
      ? "Cited by 1 publication in this graph"
      : "Cited by " + d.in_degree + " publications in this graph";
  }

  function describe(d) {
    var parts = [d.title];
    if (d.authors) {
      parts.push(d.authors);
    }
    if (d.year) {
      parts.push(d.year);
    }
    parts.push(GROUP_NAME[d.group]);
    parts.push(citedBy(d));
    return parts.join(". ");
  }

  function summary(data, nodes, links) {
    var counts = {};
    nodes.forEach(function (node) {
      counts[node.group] = (counts[node.group] || 0) + 1;
    });
    var pieces = GROUP_ORDER.filter(function (group) {
      return counts[group];
    }).map(function (group) {
      var n = counts[group];
      if (group === "external") {
        return n + (n === 1 ? " work" : " works") + " cited by them";
      }
      return n + " " + GROUP_NAME[group] + (n === 1 ? "" : "s");
    });
    return (
      "Reference graph of " +
      nodes.length +
      " works (" +
      pieces.join(", ") +
      ") connected by " +
      links.length +
      " references. The same information is listed in the table below."
    );
  }
})();
