d3.csv("data/data_ggsheet-data.csv").then(function(data) {
  console.log("Dữ liệu CSV:", data);

  if (!data || data.length === 0) {
    console.error("Không có dữ liệu hoặc lỗi.");
    return;
  }

  const totalOrdersByGroup = d3.rollup(
    data,
    v => new Set(v.map(d => d["Mã đơn hàng"])).size,
    d => d["Tên nhóm hàng"]
  );

  const margin = { top: 80, right: 60, bottom: 60, left: 60 };
  const width = 1400 - margin.left - margin.right;
  const height = 900 - margin.top - margin.bottom;

  const chartContainer = d3.select("#chart9")
      .style("display", "flex")
      .style("justify-content", "center")
      .style("align-items", "center")
      .style("height", "100vh");

  let mainSvg = chartContainer.select("svg");
  if (mainSvg.empty()) {
      mainSvg = chartContainer.append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
          .attr("preserveAspectRatio", "xMidYMid meet")
          .style("background", "#f7f9f9");
  }
  mainSvg.selectAll("*").remove();

  const svg = mainSvg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select("body").selectAll(".tooltip");
  if (tooltip.empty()) {
      tooltip = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "#333")     
          .style("color", "#fff")
          .style("padding", "6px 10px")
          .style("border-radius", "5px")
          .style("display", "none")
          .style("pointer-events", "none")
          .style("z-index", "1000");
  }

  const groupedData = d3.rollup(
      data,
      v => {
          const uniqueOrders = new Set(v.map(d => d["Mã đơn hàng"])).size;
          const groupName = v[0]["Tên nhóm hàng"];
          const totalInGroup = totalOrdersByGroup.get(groupName) || 1;
          return {
              "Số lượng đơn hàng": uniqueOrders,
              "Xác suất (%)": (uniqueOrders / totalInGroup) * 100
          };
      },
      d => d["Tên nhóm hàng"],
      d => d["Tên mặt hàng"]
  );

  let formattedData = [];
  groupedData.forEach((matHangData, nhomHang) => {
      matHangData.forEach((values, matHang) => {
          formattedData.push({
              "Nhóm Hàng": nhomHang,
              "Mặt Hàng": matHang,
              "Số lượng đơn hàng": values["Số lượng đơn hàng"],
              "Xác suất (%)": values["Xác suất (%)"]
          });
      });
  });

  console.log("Dữ liệu đã xử lý:", formattedData);

  if (formattedData.length === 0) {
      console.warn("Không có dữ liệu hợp lệ.");
      return;
  }

  const nhomHangList = Array.from(new Set(formattedData.map(d => d["Nhóm Hàng"])));

  const ncols = 3; 
  const nrows = Math.ceil(nhomHangList.length / ncols);
  const paddingX = 120;
  const paddingY = 100;

  const subWidth = (width - (ncols - 1) * paddingX) / ncols;
  const subHeight = (height - (nrows - 1) * paddingY) / nrows;

  const colorScale = d3.scaleOrdinal()
      .domain([
          "Bột cần tây", "Set 10 gói trà hoa cúc trắng", "Set 10 gói trà gừng", 
          "Set 10 gói trà dưỡng nhan", "Set 10 gói trà hoa đậu biếc", 
          "Set 10 gói trà nụ hoa nhài trắng", "Set 10 gói trà gạo lứt 8 vị", 
          "Set 10 gói trà cam sả quế", "Trà hoa cúc trắng", "Trà nụ hoa nhài trắng"
      ])
      .range([
          "#6FB1B9", "#E19595", "#A5D6A7", "#FFD54F", "#CE93D8", 
          "#F48FB1", "#90CAF9", "#FFF176", "#D7CCC8", "#B0BEC5"
      ]);

  nhomHangList.forEach((nhom, i) => {
      const row = Math.floor(i / ncols);
      const col = i % ncols;
      const xPos = col * (subWidth + paddingX);
      const yPos = row * (subHeight + paddingY);

      const subSvg = svg.append("g")
          .attr("transform", `translate(${xPos}, ${yPos})`);

      const dataSubset = formattedData
          .filter(d => d["Nhóm Hàng"] === nhom)
          .sort((a, b) => b["Xác suất (%)"] - a["Xác suất (%)"]);

      const x = d3.scaleLinear()
          .domain([0, d3.max(dataSubset, d => d["Xác suất (%)"])])
          .range([0, subWidth - 60]);

      const y = d3.scaleBand()
          .domain(dataSubset.map(d => d["Mặt Hàng"]))
          .range([0, subHeight - 60])
          .padding(0.3);

      subSvg.append("g")
          .attr("class", "grid")
          .attr("transform", `translate(0, ${subHeight - 60})`)
          .call(d3.axisBottom(x).ticks(5).tickSize(-(subHeight - 60)).tickFormat(""))
          .selectAll(".tick line")
          .attr("stroke", "#ddd");

      subSvg.append("g")
          .attr("class", "grid")
          .call(d3.axisLeft(y).tickSize(-(subWidth - 60)).tickFormat(""))
          .selectAll(".tick line")
          .attr("stroke", "#ddd");

      subSvg.append("text")
          .attr("x", subWidth / 2)
          .attr("y", -10)
          .attr("text-anchor", "middle")
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .style("fill", "#333")
          .text(`[${nhom}] ${nhom}`);

      const xAxis = d3.axisBottom(x)
          .ticks(5)
          .tickFormat(d => d + "%");
      subSvg.append("g")
          .attr("transform", `translate(0, ${subHeight - 60})`)
          .call(xAxis)
          .selectAll("text")
          .style("font-size", "10px");

      subSvg.append("g")
          .call(d3.axisLeft(y).tickSize(0).tickPadding(5))
          .selectAll("text")
          .style("font-size", "10px")
          .style("fill", "#444");

      subSvg.selectAll("rect")
          .data(dataSubset)
          .enter()
          .append("rect")
          .attr("x", 0)
          .attr("y", d => y(d["Mặt Hàng"]))
          .attr("width", d => x(d["Xác suất (%)"]))
          .attr("height", y.bandwidth())
          .attr("fill", (d, i) => colorScale(d["Mặt Hàng"]))
          .on("mouseover", function(event, d) {
              tooltip.style("display", "block")
                  .html(`
                      <b>${d["Mặt Hàng"]}</b><br>
                      Xác suất: ${d["Xác suất (%)"].toFixed(2)}%
                  `)
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 20) + "px");
              d3.select(this).attr("fill", d3.color(colorScale(d["Mặt Hàng"])).darker(0.8));
          })
          .on("mousemove", function(event) {
              tooltip.style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 20) + "px");
          })
          .on("mouseout", function(d) {
              tooltip.style("display", "none");
              d3.select(this).attr("fill", (d, i) => colorScale(d["Mặt Hàng"]));
          });

      subSvg.selectAll(".label")
          .data(dataSubset)
          .enter()
          .append("text")
          .attr("x", d => x(d["Xác suất (%)"]) + 4)
          .attr("y", d => y(d["Mặt Hàng"]) + y.bandwidth() / 2)
          .attr("alignment-baseline", "middle")
          .style("font-size", "10px")
          .style("fill", "#333")
          .text(d => `${d["Xác suất (%)"].toFixed(1)}%`);
  });

  svg.append("text")
      .attr("x", (width / 2))
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Xác suất xuất hiện của Mặt Hàng theo Nhóm Hàng");
}).catch(error => {
  console.error("Lỗi CSV:", error);
});