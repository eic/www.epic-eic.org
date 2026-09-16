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

  /* Four slots of the validated light-mode palette, checked with the
   * all-pairs rule because a network puts arbitrary classes side by side:
   * worst CVD dE 9.2, worst normal-vision dE 16.3 against a white surface.
   * Violet is the only fourth hue that clears both floors -- yellow, magenta,
   * green and red all fail against the orange slot.  The aqua slot sits below
   * 3:1 contrast, so related works are always directly labelled and every
   * node is repeated in the publication list. */
  var COLOR = {
    collaboration: "#2a78d6",
    collaborator: "#eb6834",
    cited: "#1baf7a",
    citing: "#4a3aa7"
  };

  var GROUP_NAME = {
    collaboration: "ePIC collaboration paper",
    collaborator: "ePIC collaborator paper",
    cited: "Cited by ePIC publications",
    citing: "Cites ePIC publications"
  };

  // Groups that are discovered rather than configured.
  var RELATED = { cited: true, citing: true };

  var GROUP_ORDER = ["collaboration", "collaborator", "cited", "citing"];

  var WIDTH = 1000;
  var HEIGHT = 640;

  // Node labels carry the publication title, so they need wrapping: two lines
  // of roughly this width, then an ellipsis. The full title is always in the
  // tooltip, the node's <title>, and the publication list.
  var LABEL_CHARS = 26;
  var LABEL_LINES = 2;
  var LABEL_SIZE = 11;

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
          "tools/inspire_graph.py to build it, or see the publication list above."
      );
    });

  /* ---------------------------------------------------------------- render */

  function draw(data) {
    var nodes = (data && data.nodes) || [];
    var links = (data && data.links) || [];

    if (!nodes.length) {
      message(
        data.degraded
          ? "The publication data could not be retrieved from InspireHEP when " +
              "this site was built. The publication list is above."
          : "No publications are configured yet. Add InspireHEP keys to " +
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

    // Total connections within the graph: a citing node has no incoming
    // edges at all, so sizing on in_degree alone would shrink every one of
    // them to the floor.
    nodes.forEach(function (node) {
      node.degree = (node.in_degree || 0) + (node.out_degree || 0);
    });
    var maxDegree = d3.max(nodes, function (node) {
      return node.degree;
    }) || 1;
    var radius = d3
      .scaleSqrt()
      .domain([0, maxDegree])
      .range([6, 26]); // >= 8px across at the smallest

    var controlsHost = document.getElementById("pubgraph-controls") || root;
    if (controlsHost !== root) {
      controlsHost.innerHTML = "";
    }
    var chrome = buildControls(data, nodes);
    controlsHost.appendChild(chrome);
    root.appendChild(buildLegend(data, nodes));

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
        return Math.max(radius(d.degree || 0) + 6, 14);
      });

    node
      .append("circle")
      .attr("class", function (d) {
        return "pubgraph-dot pubgraph-dot-" + d.group;
      })
      .attr("r", function (d) {
        return radius(d.degree || 0);
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
      .classed("is-persistent", function (d) {
        return !!RELATED[d.group];
      });

    label.each(function (d) {
      var lines = wrapLabel(d.label || d.texkey || d.id);
      d.labelLines = lines.length;
      var text = d3.select(this);
      lines.forEach(function (line) {
        text.append("tspan").attr("x", 0).text(line);
      });
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
          return radius(d.degree || 0) + 14;
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
        r: radius(d.target.degree || 0) + 3
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

    /* The labels live inside the zoomed viewport, so every screen-space
     * measurement -- glyph size, line spacing, the gap above the node -- has
     * to be divided by the zoom factor to stay put as the reader zooms. */
    function scaleLabels(k) {
      var size = LABEL_SIZE / k;
      var lineHeight = size * 1.15;
      label.style("font-size", size + "px").style("stroke-width", 3 / k);
      label.each(function (d) {
        var top =
          -radius(d.degree || 0) - 6 / k - ((d.labelLines || 1) - 1) * lineHeight;
        d3.select(this)
          .selectAll("tspan")
          .attr("y", function (ignored, i) {
            return top + i * lineHeight;
          });
      });
    }
    scaleLabels(1);
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

    chrome.querySelector(".pubgraph-reset").addEventListener("click", function () {
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
      tooltip.appendChild(el("div", "pubgraph-tip-count", connections(d)));

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

    var search = chrome.querySelector(".pubgraph-search");
    var showCited = chrome.querySelector(".pubgraph-show-cited");
    var showCiting = chrome.querySelector(".pubgraph-show-citing");
    var count = chrome.querySelector(".pubgraph-count");

    function groupShown(group) {
      if (group === "cited") {
        return !showCited || showCited.checked;
      }
      if (group === "citing") {
        return !showCiting || showCiting.checked;
      }
      return true;
    }

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
      var visible = 0;

      node.classed("is-hidden", function (d) {
        var shown = groupShown(d.group) && matches(d, term);
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
          ? nodes.length + " works shown"
          : visible + " of " + nodes.length + " works shown";
      renderTable(term);
    }

    search.addEventListener("input", applyFilter);
    [showCited, showCiting].forEach(function (box) {
      if (box) {
        box.addEventListener("change", applyFilter);
      }
    });

    /* --------------------------------------------------- the table-view twin */

    var table = document.getElementById("pubgraph-table");

    function renderTable(term) {
      if (!table) {
        return;
      }
      var body = table.querySelector("tbody");
      body.innerHTML = "";

      nodes
        .filter(function (d) {
          return groupShown(d.group) && matches(d, term);
        })
        .sort(function (a, b) {
          return (b.year || 0) - (a.year || 0) || (b.degree || 0) - (a.degree || 0);
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
            RELATED[d.group] ? "pubgraph-swatch is-" + d.group : "pubgraph-swatch"
          );
          swatch.style.backgroundColor = COLOR[d.group];
          swatch.style.color = COLOR[d.group];
          groupCell.appendChild(swatch);
          groupCell.appendChild(document.createTextNode(GROUP_NAME[d.group]));
          row.appendChild(groupCell);

          row.appendChild(el("td", null, d.in_degree));
          row.appendChild(el("td", null, d.out_degree));
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

    var threshold = data.threshold === undefined ? 5 : data.threshold;
    [
      ["cited", "pubgraph-show-cited", "Show works cited by more than " + threshold],
      ["citing", "pubgraph-show-citing", "Show works citing more than " + threshold]
    ].forEach(function (spec) {
      if (!nodes.some(function (node) { return node.group === spec[0]; })) {
        return;
      }
      var wrap = el("label", "pubgraph-toggle");
      var box = document.createElement("input");
      box.type = "checkbox";
      box.className = spec[1];
      box.checked = true;
      wrap.appendChild(box);
      wrap.appendChild(document.createTextNode(" " + spec[2]));
      bar.appendChild(wrap);
    });

    var reset = el("button", "pubgraph-reset btn btn-sm btn-outline-secondary", "Reset view");
    reset.type = "button";
    bar.appendChild(reset);

    bar.appendChild(el("span", "pubgraph-count", nodes.length + " works shown"));

    return bar;
  }

  function buildLegend(data, nodes) {
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
    wrapper.appendChild(legend);
    if (data.generated) {
      wrapper.appendChild(
        el("p", "pubgraph-generated", "InspireHEP data retrieved " + formatDate(data.generated))
      );
    }
    // Say so when the build could not retrieve everything, rather than
    // presenting a partial graph as the whole picture.
    if (data.degraded) {
      // expected_nodes counts the CONFIGURED publications, so compare it with
      // the primaries only -- externals are discovered, never configured.
      var primaryCount = nodes.filter(function (node) {
        return node.group !== "external";
      }).length;
      var missing = (data.expected_nodes || 0) - primaryCount;
      wrapper.appendChild(
        el(
          "p",
          "pubgraph-degraded",
          missing > 0
            ? missing +
                (missing === 1 ? " publication is" : " publications are") +
                " missing: InspireHEP could not be reached for " +
                (missing === 1 ? "it" : "them") +
                " when this site was built."
            : "Some records could not be retrieved when this site was built, " +
                "so this graph may be incomplete."
        )
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

  function connections(d) {
    var parts = [];
    if (d.in_degree) {
      parts.push(
        d.in_degree === 1
          ? "Cited by 1 publication here"
          : "Cited by " + d.in_degree + " publications here"
      );
    }
    if (d.out_degree) {
      parts.push(
        d.out_degree === 1
          ? "Cites 1 publication here"
          : "Cites " + d.out_degree + " publications here"
      );
    }
    return parts.length ? parts.join(" \u00b7 ") : "No connections in this graph";
  }

  /* Greedy word wrap into at most LABEL_LINES lines of ~LABEL_CHARS. */
  function wrapLabel(text) {
    var words = String(text || "").split(/\s+/).filter(Boolean);
    var lines = [];
    var current = "";
    var truncated = false;

    for (var i = 0; i < words.length; i++) {
      var candidate = current ? current + " " + words[i] : words[i];
      if (!current || candidate.length <= LABEL_CHARS) {
        current = candidate;
        continue;
      }
      lines.push(current);
      current = words[i];
      if (lines.length === LABEL_LINES) {
        truncated = true;
        current = "";
        break;
      }
    }
    if (current) {
      if (lines.length < LABEL_LINES) {
        lines.push(current);
      } else {
        truncated = true;
      }
    }
    if (!lines.length) {
      return [""];
    }
    // A single word longer than the line still has to be cut.
    lines = lines.map(function (line) {
      return line.length > LABEL_CHARS + 6
        ? line.slice(0, LABEL_CHARS + 5) + "\u2026"
        : line;
    });
    if (truncated) {
      var last = lines[lines.length - 1];
      if (last.slice(-1) !== "\u2026") {
        lines[lines.length - 1] = last.replace(/[\s,;:.]+$/, "") + "\u2026";
      }
    }
    return lines;
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
    parts.push(connections(d));
    // Bylines already end in a stop ("Adkins et al."), so don't double it.
    return parts
      .map(function (part) {
        return String(part).replace(/\.+$/, "");
      })
      .join(". ");
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
      " references. The same information is listed in the table above."
    );
  }
})();
