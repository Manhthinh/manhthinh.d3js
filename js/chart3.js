d3.csv("data/data_ggsheet-data.csv").then(function(data) {
    data.forEach(d => {
        d["Thời gian tạo đơn"] = new Date(d["Thời gian tạo đơn"]);
        d["Tháng"] = `T${d3.timeFormat("%m")(d["Thời gian tạo đơn"])}`;
    });

    let groupedData = d3.rollups(
        data,
        v => ({
            SL: d3.sum(v, d => +d["SL"]),
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"])
        }),
        d => d["Tháng"]
    );

    let processedData = groupedData.map(([thang, values]) => ({
        "Tháng": thang,
        "Thành tiền": values["Thành tiền"],
        "SL": values["SL"]
    })).sort((a, b) => a["Tháng"].localeCompare(b["Tháng"]));

    let margin = { top: 40, right: 50, bottom: 50, left: 50 },
    width = 700 - margin.left - margin.right,  
    height = 500 - margin.top - margin.bottom; 

    let svg = d3.select("#chart3")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);



    // Scale trục
    let x = d3.scaleBand()
        .domain(processedData.map(d => d["Tháng"]))
        .range([0, width])
        .padding(0.3);

    let y = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d["Thành tiền"])])
        .nice()
        .range([height, 0]);

    // 🎨 Thang màu theo tháng
    let colorScale = d3.scaleOrdinal()
        .domain(processedData.map(d => d["Tháng"]))
        .range(d3.schemeSet2); // Dùng bộ màu Set2

    let formatCurrency = d3.format(".2s");
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => formatCurrency(d).replace("M", "M").replace("G", "B")));
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));
    let tooltip = d3.select("body").append("div")
        .attr("class", "tooltip3")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "6px 10px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("font-size", "12px");

    let bars = svg.selectAll(".bar")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d["Tháng"]))
        .attr("y", height) // Hiệu ứng load từ dưới lên
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", d => colorScale(d["Tháng"])) // 🎨 Màu theo tháng
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`
                    <strong>${d["Tháng"]}</strong><br>
                    Doanh số: <strong>${d["Thành tiền"].toLocaleString("vi-VN")}</strong> VND<br>
                    SL: <strong>${d["SL"]}</strong>
                `)
                .style("left", (event.pageX) + "px")  
                .style("top", (event.pageY - 50) + "px");  
            
            d3.selectAll(".bar").classed("dimmed", true);
            d3.select(this).classed("dimmed", false);
        })
        .on("mouseout", function() {
            tooltip.style("display", "none");
            d3.selectAll(".bar").classed("dimmed", false);
        });
    bars.transition()
        .duration(1000)
        .attr("y", d => y(d["Thành tiền"]))
        .attr("height", d => height - y(d["Thành tiền"]));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#4CAF50")
        .text("📊 Doanh số bán hàng theo Tháng");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .text("Tháng");
    
    
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .text("Thành tiền (VND)");
});
