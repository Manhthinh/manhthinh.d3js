d3.csv("data/data_ggsheet-data.csv").then(function(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.error("⚠️ Lỗi: CSV rỗng hoặc không hợp lệ!");
        return;
    }
    let groupedData = d3.rollups(
        data,
        v => ({
            SL: d3.sum(v, d => +d["SL"] || 0),
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"] || 0)
        }),
        d => d["Tên nhóm hàng"]
    );

    let processedData = groupedData.map(([nhom, values]) => ({
        "Nhóm Hàng": nhom,
        "Thành tiền": values["Thành tiền"],
        "SL": values["SL"]
    }));

    processedData.sort((a, b) => b["Thành tiền"] - a["Thành tiền"]);

    let container = d3.select("#chart2").node().getBoundingClientRect();
    let maxWidth = 800, maxHeight = 650;
    let fullWidth = Math.min(container.width || 500, maxWidth);
    let fullHeight = Math.min(container.height || 500, maxHeight);

    let margin = { top: 45, right: 35, bottom: 80, left: 100 };
    let width = fullWidth - margin.left - margin.right;
    let height = fullHeight - margin.top - margin.bottom;

    let svg = d3.select("#chart2")
        .append("svg")
        .attr("width", fullWidth)
        .attr("height", fullHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    let x = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d["Thành tiền"])])
        .range([0, width]);

    let y = d3.scaleBand()
        .domain(processedData.map(d => d["Nhóm Hàng"]))
        .range([0, height])
        .padding(0.2);

    let neonColors = ["#ff6b6b", "#ffa94d", "#ffd43b", "#74c0fc", "#b197fc"];
    let color = d3.scaleOrdinal(neonColors);
    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("fill", "#FF5733")
        .text("Doanh số bán hàng theo Nhóm Hàng");

    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisBottom(x).tickSize(-height).tickFormat(""))
        .attr("transform", `translate(0,${height})`)
        .selectAll("line")
        .attr("stroke", "#ddd");

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => {
            if (d < 1_000_000) {
                return d.toLocaleString("vi-VN"); 
            } else if (d < 1_000_000_000) {
                return (d / 1_000_000).toFixed(0) + "M"; 
            } else {
                return (d / 1_000_000_000).toFixed(1) + "B"; 
            }
        }))
        .selectAll("text")
        .style("font-size", "10px")
        .style("fill", "#333");

    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "10px")
        .style("fill", "#333");

    let tooltip2 = d3.select("body").append("div")
        .attr("class", "tooltip2")
        .style("position", "absolute")
        .style("background", "rgba(39, 44, 47, 0.8)")
        .style("color", "white")
        .style("padding", "6px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("font-size", "11px");

    svg.selectAll(".bar")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d["Nhóm Hàng"]))
        .attr("width", d => x(d["Thành tiền"]))
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d["Nhóm Hàng"]))
        .on("mouseover", function(event, d) {
            tooltip2.style("display", "block")
                .html(`
                    <strong>${d["Nhóm Hàng"]}</strong><br>
                    Doanh số: <strong>${d["Thành tiền"].toLocaleString("vi-VN")}</strong> VND<br>
                    Số lượng: <strong>${d["SL"].toLocaleString("vi-VN")} SKU </strong>
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");

            d3.select(this).attr("opacity", 0.8);
        })
        .on("mousemove", function(event) {
            tooltip2.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltip2.style("display", "none");
            d3.select(this).attr("opacity", 1);
        });

    svg.selectAll(".bar-label")
        .data(processedData)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => Math.max(x(d["Thành tiền"]) - 100, 5))
        .attr("y", d => y(d["Nhóm Hàng"]) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text(d => `${(d["Thành tiền"] / 1_000_000).toFixed(0)} Triệu VND`)
        .style("font-size", "10px")
        .style("fill", "white")
        .style("font-weight");

    svg.selectAll(".domain")
        .attr("stroke", "black")
        .attr("stroke-width", "1.5px");

    svg.selectAll(".tick line")
        .attr("stroke", "#ddd");
});
