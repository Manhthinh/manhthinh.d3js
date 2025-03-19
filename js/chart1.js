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
        d => d["Tên mặt hàng"], 
        d => d["Tên nhóm hàng"]
    );

    let processedData = groupedData.map(([matHang, nhomData]) => {
        let firstGroup = nhomData[0];
        return {
            "Mặt Hàng": matHang,
            "Thành tiền": firstGroup[1]["Thành tiền"],
            "Tên nhóm hàng": firstGroup[0],  
            "SL": firstGroup[1]["SL"]
        };
    });
    

    processedData.sort((a, b) => b["Thành tiền"] - a["Thành tiền"]);
    let container = d3.select("#chart1").node().getBoundingClientRect();
    let maxWidth = 750, maxHeight = 650;  
    let fullWidth = Math.min(container.width || 500, maxWidth);
    let fullHeight = Math.min(container.height || 500, maxHeight);

    let margin = { top: 45, right: 150, bottom: 80, left: 150 };
    let width = fullWidth - margin.left - margin.right;
    let height = fullHeight - margin.top - margin.bottom;
    let svg = d3.select("#chart1")
        .append("svg")
        .attr("width", fullWidth)
        .attr("height", fullHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let x = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d["Thành tiền"])])
        .range([0, width]);

    let y = d3.scaleBand()
        .domain(processedData.map(d => d["Mặt Hàng"]))
        .range([0, height])
        .padding(0.2);

    let colorScale = d3.scaleOrdinal()
        .domain([...new Set(processedData.map(d => d["Tên nhóm hàng"]))])
        .range(["#6FB1B9", "#E19595", "#A5D6A7", "#FFD54F", "#CE93D8", "#F48FB1"]);


    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("fill", "#4CAF50")
        .text("Doanh số bán hàng theo Mặt Hàng");

    // **Thêm grid (đường lưới)**
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisBottom(x).tickSize(-height).tickFormat(""))
        .attr("transform", `translate(2,${height})`)
        .selectAll("line")
        .attr("stroke", "#ddd");

    // **Vẽ trục X**
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
    
    let tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "white")
        .style("padding", "5px 10px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("font-size", "12px");

    svg.selectAll(".bar")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d["Mặt Hàng"]))
        .attr("width", d => x(d["Thành tiền"]))
        .attr("height", y.bandwidth())
        .attr("fill", d => colorScale(d["Tên nhóm hàng"]))
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`
                    <b>${d["Mặt Hàng"]}</b><br>
                    Doanh số: ${(d["Thành tiền"] / 1_000_000).toFixed(0)} triệu VND<br>
                    Số lượng: ${d["SL"]}
                `);
            d3.select(this).attr("opacity", 0.8);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("display", "none");
            d3.select(this).attr("opacity", 1);
        });

    svg.selectAll(".bar-label")
        .data(processedData)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => Math.max(x(d["Thành tiền"]) - 60, 6 ))
        .attr("y", d => y(d["Mặt Hàng"]) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text(d => `${(d["Thành tiền"] / 1_000_000).toFixed(0)}M`)
        .style("font-size", "10px")
        .style("fill", "white")
        .style("font-weight");

    let legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 0)`);

    let uniqueGroups = [...new Set(processedData.map(d => d["Tên nhóm hàng"]))];

    legend.selectAll(".legend-item")
        .data(uniqueGroups)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`)
        .each(function(d) {
            let g = d3.select(this);
            g.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", colorScale(d));

            g.append("text")
                .attr("x", 20)
                .attr("y", 10)
                .text(d)
                .style("font-size", "12px")
                .style("fill", "#333");
        });
});
