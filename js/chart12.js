
d3.csv("data/data_ggsheet-data.csv").then(rawData => {
    rawData.forEach(d => {
      d["Thành tiền"] = +d["Thành tiền"];
    });
    
const margin = { top: 80, right: 50, bottom: 120, left: 100 },
width = 1600 - margin.left - margin.right,
height = 600 - margin.top - margin.bottom;

const svg = d3.select("#chart12")
.append("svg")
.attr("width", width + margin.left + margin.right)
.attr("height", height + margin.top + margin.bottom)
.append("g")
.attr("transform", `translate(${margin.left},${margin.top})`);

svg.append("text")
  .attr("x", width / 2)
  .attr("y", -20)
  .attr("text-anchor", "middle")
  .style("font-size", "18px")
  .style("font-weight", "bold")
  .style("fill", "#4e79a7")
  .text("Phân phối Mức Chi Tiêu của Khách Hàng");

    
const tooltip = d3.select("body").append("div")
.attr("class", "tooltip");

const spendingByCustomer = d3.rollups(
  rawData,
  v => d3.sum(v, d => d["Thành tiền"]),
  d => d["Mã khách hàng"]
);

const formatNumber = d3.format(",");
const binSize = 50000;
const binsMap = new Map();

spendingByCustomer.forEach(([customerId, totalSpend]) => {
  const binIndex = Math.floor(totalSpend / binSize);
  const lowerBound = binIndex * binSize;
  const upperBound = lowerBound + binSize;
  const binLabel = `${upperBound / 1000}K`;

  const lowerFormatted = formatNumber(lowerBound);
  const upperFormatted = formatNumber(upperBound);
  const tooltipLabel = `${lowerFormatted} đến ${upperFormatted}`;

  if (!binsMap.has(binLabel)) {
      binsMap.set(binLabel, { count: 0, tooltip: tooltipLabel, lower: lowerBound, upper: upperBound });
  }

  binsMap.get(binLabel).count += 1;
});

const data = Array.from(binsMap, ([label, { count, tooltip, lower, upper }]) => ({
  label,
  count,
  tooltip,
  lower,
  upper
})).sort((a, b) => a.lower - b.lower);

console.log("Phân phối mức chi trả:", data);

const x = d3.scaleBand()
  .domain(data.map(d => d.label))
  .range([0, width])
  .padding(0.1);

const y = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.count)])
  .nice()
    .range([height, 0]);
    


svg.append("g")
  .attr("class", "grid")
  .call(d3.axisLeft(y)
      .tickSize(-width)
      .tickFormat("")
  );

svg.append("g")
  .attr("transform", `translate(0, ${height})`)
  .call(d3.axisBottom(x)
      .tickFormat((d, i) => (i % 2 === 0) ? d : "")
  )
  .selectAll("text")
  .style("text-anchor", "end")
  .attr("dx", "-0.8em")
  .attr("dy", "-0.15em")
  .attr("transform", "rotate(-90)")
  .style("font-size", "12px");

svg.append("g")
  .call(d3.axisLeft(y))
  .selectAll("text")
  .style("font-size", "12px");

svg.append("text")
  .attr("class", "axis-title")
  .attr("x", width / 2)
  .attr("y", height + 80)
  .attr("text-anchor", "middle")
  .text("Khoảng Mức Chi Tiêu (VNĐ)");

svg.append("text")
  .attr("class", "axis-title")
  .attr("transform", "rotate(-90)")
  .attr("x", -height / 2)
  .attr("y", -60)
  .attr("text-anchor", "middle")
  .text("Số lượng khách hàng");

// 📊 **Vẽ biểu đồ cột**
svg.selectAll(".bar")
  .data(data)
  .join("rect")
  .attr("class", "bar")
  .attr("x", d => x(d.label))
  .attr("y", d => y(d.count))
  .attr("width", x.bandwidth())
  .attr("height", d => height - y(d.count))
  .attr("fill", "#4e79a7")
  .on("mouseover", (event, d) => {
      d3.select(event.currentTarget).transition().duration(200).attr("fill", "#f28e2c");

      const lowerFormatted = d.lower.toLocaleString('vi-VN');
      const upperFormatted = d.upper.toLocaleString('vi-VN');
      tooltip
          .style("opacity", 1)
          .html(`
              <strong>Mức chi trả:</strong> ${lowerFormatted} - ${upperFormatted} VNĐ<br/>
              <strong>Số lượng KH:</strong> ${d.count.toLocaleString('vi-VN')}
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
  })
  .on("mousemove", (event) => {
      tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
  })
  .on("mouseout", (event) => {
      d3.select(event.currentTarget).transition().duration(200).attr("fill", "#4e79a7");
      tooltip.style("opacity", 0);
  });

}).catch(error => {
console.error("Lỗi load dữ liệu:", error);
});