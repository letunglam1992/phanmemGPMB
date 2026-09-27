//! Chạy máy chủ mạng nội bộ độc lập để kiểm thử nối giao diện (test/mang-that.test.ts).
//! cargo run --example may_chu_thu -- <thư mục> <cổng>
#[tokio::main]
async fn main() {
    let a: Vec<String> = std::env::args().collect();
    let d = gpmb_sonla_lib::may_chu::khoi_dong(a[1].clone().into(), a[2].parse().unwrap()).await.unwrap();
    println!("VAN_TAY={}", d.van_tay);
    tokio::signal::ctrl_c().await.ok();
}
