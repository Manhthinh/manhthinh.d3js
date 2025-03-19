const margin = { top: 40, right: 30, bottom: 60, left: 60 },
      width = 550 - margin.left - margin.right,
      height = 350 - margin.top - margin.bottom;

const chartContainer = d3.select("#chart8")
    .style("display", "flex")
    .style("justify-content", "center")
    .style("align-items", "center")
    .style("height", "100vh");

let svg = chartContainer.select("svg");
if (svg.empty()) {
    svg = chartContainer.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
}
svg.selectAll("*").remove();

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Sử dụng let thay vì const cho tooltip
let tooltip = d3.select("body").selectAll(".tooltip");
if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "#fff")
        .style("padding", "6px 10px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("pointer-events", "none") 
        .style("display", "none");
}

d3.csv("data/data_ggsheet-data.csv").then(function(data) {
    data.forEach(d => {
        d["Tháng"] = d3.timeParse("%Y-%m-%d %H:%M:%S")(d["Thời gian tạo đơn"]).getMonth() + 1;
    });

    const totalOrdersByMonth = d3.rollups(
        data,
        v => new Set(v.map(d => d["Mã đơn hàng"])).size, 
        d => d["Tháng"]
    );
    const totalOrdersMap = new Map(totalOrdersByMonth);

    const groupedData = d3.rollups(
        data,
        v => ({
            "Số lượng đơn hàng": new Set(v.map(d => d["Mã đơn hàng"])).size,
            "Xác suất (%)": (new Set(v.map(d => d["Mã đơn hàng"])).size / totalOrdersMap.get(v[0]["Tháng"])) * 100
        }),
        d => d["Tháng"],
        d => d["Tên nhóm hàng"]
    );

    let formattedData = [];
    groupedData.forEach(([thang, nhomData]) => {
        nhomData.forEach(([nhomHang, values]) => {
            formattedData.push({
                "Tháng": thang,
                "Nhóm Hàng": nhomHang,
                "Số lượng đơn hàng": values["Số lượng đơn hàng"],
                "Xác suất (%)": values["Xác suất (%)"]
            });
        });
    });

    formattedData.sort((a, b) => a["Tháng"] - b["Tháng"] || b["Xác suất (%)"] - a["Xác suất (%)"]);
    const nhomHangList = Array.from(new Set(formattedData.map(d => d["Nhóm Hàng"])));
    
    const x = d3.scaleLinear()
        .domain([1, 12]) 
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(formattedData, d => d["Xác suất (%)"])])
        .nice()
        .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(nhomHangList)
        .range(d3.schemeSet2);

    g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(12).tickSize(-height).tickFormat(""))
        .selectAll(".tick line")
        .attr("stroke", "#ddd");

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
        .selectAll(".tick line")
        .attr("stroke", "#ddd");

    const nestedData = d3.groups(formattedData, d => d["Nhóm Hàng"]);
    const line = d3.line()
        .x(d => x(d["Tháng"]))
        .y(d => y(d["Xác suất (%)"]));

    g.selectAll(".line")
        .data(nestedData)
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", d => colorScale(d[0]))
        .attr("stroke-width", 2)
        .attr("d", d => line(d[1]));

    g.selectAll(".dot")
        .data(formattedData)
        .enter()
        .append("circle")
        .attr("cx", d => x(d["Tháng"]))
        .attr("cy", d => y(d["Xác suất (%)"]))
        .attr("r", 4)
        .attr("fill", d => colorScale(d["Nhóm Hàng"]))
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`<b>${d["Nhóm Hàng"]}</b><br>Tháng: ${d["Tháng"]}<br>Xác suất: ${d["Xác suất (%)"].toFixed(2)}%`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 30) + "px");
            d3.select(this).attr("r", 6);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("display", "none");
            d3.select(this).attr("r", 4);
        });

    g.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d => `T${String(d).padStart(2, "0")}`));

    g.append("g")
        .call(d3.axisLeft(y).tickFormat(d => `${d.toFixed(0)}%`));

    g.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .attr("fill", "#4CAF50")
        .text("Xác suất xuất hiện của Nhóm hàng theo Tháng");

    const legend = g.append("g")
        .attr("transform", `translate(${width / 2 - (nhomHangList.length * 60) / 2}, ${height + 40})`);

    const numCols = Math.min(4, nhomHangList.length);
    const legendSpacing = 100;
    const legendRows = Math.ceil(nhomHangList.length / numCols);

    nhomHangList.forEach((nhom, i) => {
        const col = i % numCols;
        const row = Math.floor(i / numCols);

        const legendRow = legend.append("g")
            .attr("transform", `translate(${col * legendSpacing}, ${row * 20})`);

        legendRow.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", colorScale(nhom));

        legendRow.append("text")
            .attr("x", 15)
            .attr("y", 10)
            .text(nhom)
            .style("font-size", "11px")
            .attr("fill", "#333");
    });
}).catch(error => {
    console.error("Lỗi load dữ liệu:", error);
});