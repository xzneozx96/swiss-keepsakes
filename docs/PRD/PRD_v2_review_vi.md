# Nhận xét PRD v2: Swiss Stories & Gifts

Ngày nhận xét: 12/10/2026. Đối chiếu với `Swiss_Stories_and_Gifts_PRD_v2.md`, kế hoạch kinh doanh (`client-resources/Lucerne_Keepsake_Ke_hoach_kinh_doanh.pdf`) và các trang tham khảo được dẫn trong mục 18.3 của PRD.

Nhìn chung PRD được viết cẩn thận. Tài liệu tách rõ phần "đã chốt", phần "Đề xuất" và phần "Còn mở", không hứa vượt khả năng, và định nghĩa "Hoàn tất" (đã cung cấp **và** đã thu đủ tiền) là hợp lý. Các vấn đề chính:

- Có vài chỗ mâu thuẫn hoặc mơ hồ trong nội bộ tài liệu.
- Phase 1 lớn hơn nhiều so với MVP 30 ngày trong kế hoạch kinh doanh. PRD có nêu khoảng cách này nhưng không đề xuất cắt giảm.
- Một số cơ chế khác với cách chính các nền tảng mà PRD dẫn chứng đang vận hành.
- Có 18 quyết định còn mở, trong đó vài quyết định chặn việc phát triển.

Các mục được xếp theo mức độ ảnh hưởng đến pilot hoặc nguy cơ phải làm lại. Số dòng (L…) tính theo PRD v2.

---

## A. Mâu thuẫn và chỗ chưa nhất quán

### A1. Ngày nhận quà: khách không biết ngày đó đã được cam kết hay chưa (L27, L131, L136)
- Mục 1.2 ghi hệ thống "không hứa giao đúng ngày". L136 ghi ngày mong muốn "không tự trở thành cam kết giao hàng chưa được merchant xác nhận".
- Mục 6.2 bước 4 lại tự xác nhận đơn khi khả dụng cho ngày đó hợp lệ. Nếu hiểu chặt chẽ, "đơn đã xác nhận" và "ngày đã cam kết" là hai việc khác nhau. Nhưng PRD không nói khách được thông báo thế nào về việc mình nhận được loại nào. Khách nhận tin "đơn đã xác nhận" kèm một ngày sẽ hiểu đó là lời hứa.
- **Đề xuất:** chọn một mô hình.
  - (a) Tự xác nhận và ngày nhận trở thành cam kết. Mô hình này chỉ an toàn khi đã mô hình hóa thời gian chuẩn bị, cutoff và năng lực (O04).
  - (b) Trạng thái "Đã nhận yêu cầu", sau đó merchant xác nhận ngày. Cách này an toàn hơn cho hàng khắc tên. Tuy nhiên cần cam kết thời gian merchant phản hồi và cần định nghĩa thời điểm thu tiền (ví dụ giữ tiền trên thẻ, rồi thu khi merchant xác nhận).
- Với vận hành một người ở Phase 1, (b) hoặc (a) kèm thời gian chuẩn bị dư dả đều hợp lý. Văn bản hiện tại đang cố làm cả hai.

### A2. Thiếu địa điểm nhận hàng (L87, L136, L449; kế hoạch kinh doanh mục 1, 3, 4)
- Ý tưởng cốt lõi của kế hoạch kinh doanh là nối "điểm nhận hàng" vào phễu bán. Kế hoạch hứa với khách trong ngày "mua online, nhận thuận tiện", và mạng lưới pilot có "2 điểm bán/nhận hàng".
- PRD chỉ có *ngày* mong muốn nhận. Không có *nơi nhận* (điểm nhận, quầy lễ tân khách sạn, điểm gặp khi đi tour) và không có khung giờ.
- Trong khi đó, "khách rời địa phương trước khi quà sẵn sàng" lại là một rủi ro hàng đầu (L449).
- **Đề xuất:** không có hệ thống giao hàng là được, nhưng cần thêm **phương án bàn giao** vào đơn hàng hóa:
  - Merchant cấu hình danh sách điểm nhận hoặc cách nhận.
  - Khách chọn một điểm, kèm ngày hoặc khung giờ, và thấy giờ mở cửa.
- Đây là cách "click-and-collect" thường làm, ví dụ điểm nhận hàng tại chỗ của Shopify. Chi phí làm thấp và giảm trực tiếp rủi ro ở L449.

### A3. Đa ngôn ngữ: nguồn tự mâu thuẫn, PRD đã chọn một phía mà không ghi rõ (L54, L75, L394)
- Ở dòng khách lẻ trong ngày, kế hoạch kinh doanh ghi "nội dung đa ngôn ngữ" là một phần của *cách tiếp cận*. Nhưng lộ trình của chính kế hoạch lại đặt "đa ngôn ngữ" vào Ngày 91–180.
- PRD đi theo lộ trình: dòng tương ứng (L54) bỏ đa ngôn ngữ, và mục 4.1 đẩy sang giai đoạn mở rộng. Lựa chọn này có cơ sở, nhưng PRD nên ghi rõ đó là một quyết định.
- Ngoài ra, O01 cho biết ngôn ngữ ra mắt chưa được xác nhận.
- **Đề xuất:** chốt rõ ngôn ngữ ra mắt. Với du khách nước ngoài ở Lucerne, tối thiểu có lẽ là tiếng Anh cộng ngôn ngữ của nhóm khách mục tiêu. Kể cả khi dịch sau, mô hình nội dung và sản phẩm nên hỗ trợ đa ngôn ngữ (i18n) ngay từ đầu. Bổ sung về sau rất tốn kém.

### A4. "tour riêng" mang hai nghĩa khác nhau (L71 và L72)
- L71: "tour riêng nhận yêu cầu báo giá" nghĩa là **tour private**, giá theo báo giá.
- L72: "checkout tour riêng" nghĩa là tour được **checkout tách riêng** (không vào giỏ hàng).
- Lập trình viên có thể hiểu L72 là "checkout cho tour private", một luồng mà mục 6.3 nói còn chưa đặc tả.
- **Đề xuất:** chỉ dùng "tour riêng (private)" cho tour private, và viết "checkout từng booking" cho nghĩa còn lại.

### A5. Phạm vi Phase 1 so với MVP 30 ngày (L391, L396, L447)
- PRD thừa nhận Phase 1 rộng hơn MVP 30 ngày trong nguồn, nhưng vẫn giữ toàn bộ. Phase 1 hiện gồm:
  - tài khoản và vai trò nhân sự
  - tour có lịch cố định cùng báo giá tour private
  - ba chính sách thanh toán cho mọi loại sản phẩm
  - ghi thu bên ngoài, hoàn tiền và điều chỉnh
  - sổ hoa hồng và báo cáo cho đối tác
  - blog có bình luận, và đánh giá
  - widget tư vấn
  - hồ sơ chuyến đi và phân tích bốn nhóm khách
  - mô hình sở hữu nhiều merchant
- Mục tiêu Ngày 1–30 của kế hoạch kinh doanh là "MVP có thể nhận đơn và ghi nguồn bán".

---

## B. Tính khả thi và rủi ro vận hành

### B1. Hoa hồng và đánh giá phụ thuộc vào một lần bấm "Hoàn tất" thủ công (L225, L228, L290)
- Hoa hồng chỉ được ghi nhận khi merchant đánh dấu hoàn tất, và không có cơ chế tự hoàn tất. Hệ quả:
  - Quên bấm thì đối tác không bao giờ có hoa hồng và khách không bao giờ được mời đánh giá.
  - Bên nợ hoa hồng lại quyết định khi nào khoản đó phải trả. Điều này làm giảm niềm tin của đối tác, và guide không có cách kiểm chứng.
  - Mỗi tấm postcard CHF 8 cũng cần đóng đơn bằng tay.
- **Mô hình gợi ý:** ghi nhận giao dịch ngay ở trạng thái *chờ duyệt* (pending). Giao dịch chuyển sang *đã duyệt* (approved) sau một thời gian kiểm tra hoặc hết hạn đổi trả, và bị *từ chối* khi hủy hoặc hoàn tiền. Đối tác thấy cả ba trạng thái. (Đây là mô hình thường gặp ở các mạng affiliate, nhưng trang Awin mà PRD dẫn không mô tả điều này. Cần kiểm tra lại với tài liệu của một mạng affiliate trước khi trình bày với khách hàng.)
- **Đề xuất:**
  - Cho đối tác thấy `chờ duyệt → đã duyệt → đã trả` (PRD đã cho phép nhãn "ước tính" ở L290).
  - **Tự hoàn tất** khi dư nợ bằng 0 và đã qua N ngày kể từ ngày nhận hàng hoặc ngày dịch vụ mà không có khiếu nại. Merchant vẫn có thể đóng sớm hơn hoặc báo vấn đề.
  - Chỉ giữ thao tác hoàn tất thủ công cho trường hợp "đã cung cấp nhưng còn nợ".

### B2. Trả sau và không trả trước cho tour có số chỗ cố định (L143, L246–252, L450)
- "Không trả trước vẫn có thể được xác nhận", nhưng không có gì bảo đảm booking: không lưu thẻ, không tự trừ tiền, không tự hủy khi khách không trả. Khách phải tự "mở giao dịch để trả dư nợ".
- Với tour có số chỗ giới hạn, bất kỳ ai cũng có thể giữ chỗ miễn phí. PRD có nêu rủi ro này (L450) nhưng O05 vẫn để ngỏ cách xử lý.
- **Chính nguồn tham khảo của PRD làm khác.** Klook Pay Later (được dẫn ở mục 18.3):
  - yêu cầu thông tin thẻ khi đặt
  - tự động trừ tiền vào ngày đã nêu khi đặt ("automatically ... at a later date as specified during booking")
  - gửi email nếu trừ tiền thất bại, và đơn có thể bị hủy nếu khách không hoàn tất thanh toán đúng hạn ("your order may be canceled")
- `pay_online_later` của Booking.com cũng thu tiền trước khi hết hạn hủy miễn phí ("before the free cancellation period ends").
- **Đề xuất:**
  - "Không trả trước" nên có nghĩa là **lưu thẻ khi đặt, tự trừ tiền vào hạn đã công bố, tự nhả chỗ nếu không thu được**. Với Stripe, đó là SetupIntent cộng PaymentIntent off-session.
  - Chỉ giữ hình thức "trả trong ngày, không bảo đảm" như ngoại lệ cấp merchant cho kênh tin cậy, ví dụ đoàn của công ty lữ hành.
  - Cần xử lý cả trường hợp ngân hàng yêu cầu xác thực lại (3DS/SCA) và trừ tiền thất bại.

### B3. Chốt mô hình dòng tiền ngay, không để sau (L83, L262–264, O06, O17)
- PRD yêu cầu mô hình nhiều merchant "ngay từ đầu", tài khoản nhận tiền riêng và xác minh provider trước khi mở bán, nhưng lại hoãn quyết định provider và Connect.
- Không thể thiết kế checkout, hoàn tiền và sổ hoa hồng khi chưa biết ai là **bên bán chính thức** (merchant of record).
  - Nếu nền tảng thu tiền thay cho các merchant độc lập, đó là mô hình sàn hoặc trung gian thanh toán, kéo theo yêu cầu pháp lý và KYC.
  - Nếu mỗi merchant là bên bán chính thức, nền tảng cần tài khoản liên kết (connected account).
- **Đề xuất:** quyết định trước khi bắt đầu thiết kế checkout.
  - Nếu hướng nhiều merchant là thật, hãy xây Phase 1 trên mô hình tài khoản liên kết, với Chị Ngọc là merchant liên kết đầu tiên (ví dụ Stripe Connect; cần xác nhận loại tài khoản nào khả dụng cho nền tảng tại Thụy Sĩ). Cách này tránh phải chuyển đổi lịch sử thanh toán về sau.
  - Nhờ tư vấn pháp lý xác nhận vị trí bên bán chính thức và VAT (O06). Đây là mục "cần tư vấn xác nhận"; tài liệu này cố ý không nêu ngưỡng cụ thể.

### B4. Báo cáo đối tác chỉ được bảo vệ bằng một link bí mật (L155, L296–302, O09)
- Link không cần đăng nhập rồi sẽ bị chuyển tiếp trong các nhóm chat.
- PRD đã có **mã xác nhận qua email** cho khách. Có thể dùng lại cho đối tác: đối tác nhập email và nhận mã. Cách này vẫn là "không đăng nhập truyền thống", và thu hồi được theo từng người.
- **Rủi ro nhận diện lại khách:** tên khách được ẩn, nhưng guide thấy sản phẩm, giá trị và ngày của từng đơn trên chuyến xe 20 người do chính họ dẫn. Họ có thể đoán ra ai mua gì.
- **Đề xuất:** gộp số liệu theo ngày hoặc theo lịch khởi hành, hoặc ẩn chi tiết sản phẩm từng đơn khi số lượng quá nhỏ.

### B5. Nhiều chính sách thanh toán trong cùng một giỏ hàng hóa (L238–240, O05)

> Lưu ý: mục này đề nghị xem lại một yêu cầu đã chốt (L246: hàng hóa hỗ trợ cả ba chế độ thanh toán). Lý do là chi phí và độ phức tạp nêu dưới đây.

- Mỗi SKU hàng hóa có thể là trả 100%, đặt cọc hoặc không trả trước, nên một giỏ có thể trộn cả ba. L240 yêu cầu giải quyết việc này ngay Phase 1.
- Với quà CHF 8–179, đặt cọc và trả sau mang lại ít giá trị nhưng thêm nhiều phức tạp: thu tách đợt, hoàn một phần, hoa hồng trên khoản trả một phần.
- **Đề xuất:** ở Phase 1, hàng hóa chỉ trả trước 100%. Đặt cọc và không trả trước áp dụng cho tour, sau này cho lưu trú và trải nghiệm. Cách này loại bỏ hoàn toàn bài toán giỏ hàng nhiều chính sách. Nếu một món giá trị cao cần đặt cọc, bán món đó ngoài giỏ.

### B6. Store Manager vừa ghi thu tiền mặt vừa bấm hoàn tất, làm phát sinh hoa hồng (L104, L254, O07)
- Một người có thể ghi nhận khoản thu bên ngoài rồi hoàn tất đơn, từ đó phát sinh hoa hồng. Khi quyền điều chỉnh chưa được định nghĩa, không có sự phân tách trách nhiệm.
- **Đề xuất cho Phase 1:**
  - Manager: ghi nhận khoản thu, chỉ được thêm, không được sửa.
  - Owner: sửa sai và hủy khoản thu, bắt buộc nêu lý do.
  - Mọi sự kiện liên quan đến tiền được ghi vào sổ không thể sửa xóa.
- PRD đã yêu cầu truy vết (L412). Đề xuất này biến yêu cầu đó thành quy tắc phân quyền.

---

## C. Những điểm khác với thông lệ phổ biến

### C1. Bắt buộc đăng nhập trước khi mua (L110, L94)
- Quy tắc này (cùng với việc bỏ guest checkout của v1) đi ngược hành vi mục tiêu: mua ngẫu hứng qua QR trên xe đang chạy.
- Nên cho khách thêm vào giỏ và nhập thông tin trước bất kỳ bước tài khoản nào, rồi tạo tài khoản ở bước thanh toán.
- **Đề xuất:**
  - Giỏ hàng được giữ khi chưa đăng nhập.
  - Đăng nhập là **một bước nhập mã email ngay trong checkout**, không phải cửa chặn từ đầu.
  - Có nút Google một chạm, thêm Apple Pay và Google Pay ở bước thanh toán.
- **Điểm có lợi nên ghi vào PRD:** vì mọi người mua đều có tài khoản, nguồn giới thiệu có thể được **gắn vào tài khoản khi đăng nhập**. Điều này giải quyết một phần câu hỏi khác thiết bị trong O08.

### C2. Chưa có cửa sổ attribution (L280–284, O08)
- Chính nguồn tham khảo của PRD (Awin) nêu thời hạn cookie "thường là 30 ngày theo chuẩn ngành" ("typically 30 days, as per industry standards"), kèm last-click.
- **Đề xuất:**
  - Mặc định cửa sổ last-click 30 ngày.
  - Lưu nguồn giới thiệu phía server khi khách đăng nhập (xem C1).
  - Khóa nguồn tại thời điểm đặt (PRD đã đề xuất ở L282).
  - Về sau cho phép mỗi merchant cấu hình cửa sổ.
- Về consent: cookie attribution có thể cần sự đồng ý của khách đến từ EU. Gắn nguồn vào đơn phía server giúp giảm phụ thuộc vào cookie.

### C3. Chưa đặc tả thông báo giao dịch
- Email duy nhất được đặc tả là yêu cầu widget gửi cho merchant. Một cửa hàng nhận đặt cọc và booking trả sau cần tối thiểu:
  - xác nhận đơn hoặc booking
  - biên nhận thanh toán
  - nhắc trả dư nợ và báo quá hạn
  - nhắc nhận hàng (ngày, địa điểm, giờ mở cửa)
  - nhắc lịch tour (điểm gặp, giờ)
  - xác nhận hủy và hoàn tiền
  - mời đánh giá
  - lời mời nhân sự
  - cảnh báo nội bộ cho merchant: đơn mới, thanh toán thất bại
- **Đề xuất:** thêm ma trận thông báo (sự kiện × người nhận × kênh). Tách khỏi email marketing, như L124 đã nêu.

### C4. Chưa liệt kê các trang pháp lý và chứng từ
Cần tư vấn pháp lý xác nhận tất cả các mục sau:
- điều khoản sử dụng và mua hàng
- chính sách quyền riêng tư (nFADP của Thụy Sĩ, và GDPR với khách đến từ EU)
- trang thông tin pháp nhân (Impressum)
- biên nhận hoặc hóa đơn có xử lý VAT
- quy tắc hủy với hàng cá nhân hóa: dù áp dụng chính sách đổi trả nào, hãy ghi rõ hàng khắc tên không được đổi trả ở trang sản phẩm và ở checkout, và nhờ tư vấn xác nhận cơ sở pháp lý.

### C5. Đánh giá (L314–316)
- Chỉ người đã mua mới được đánh giá là mô hình đúng.
- Nên thêm một đoạn công khai giải thích cách đánh giá được xác minh.
- Ghi rõ merchant không được xóa đánh giá sản phẩm, điều mà L308 đã ngụ ý.
- Với số lượng đơn pilot (vài đơn), phần đánh giá gần như sẽ trống.

### C6. Hồ sơ chuyến đi làm checkout thêm nặng (L56–62, O13)
- Hỏi "đoàn hay tự túc" và ngày đến, ngày rời đi trong checkout là thêm một biểu mẫu cho mọi người mua.
- **Đề xuất:** đưa thành bước ngắn, tùy chọn, *sau khi* thanh toán (trên màn hình xác nhận), hoặc suy ra từ ngày tour đã đặt và ngày nhận hàng. Giữ nhóm "chưa xác định" làm mặc định như PRD đã nêu.

---

## D. Các quyết định còn mở đang chặn phát triển

Cần có câu trả lời trước khi ước lượng phát triển có ý nghĩa:

1. **O06 / O17:** provider thanh toán, bên bán chính thức, có dùng tài khoản liên kết hay không (B3).
2. **O05:** lịch thu tiền, giữ tồn hoặc chỗ trong lúc thanh toán, cơ chế trả sau (B2, B5).
3. **Mô hình xác nhận đơn hàng hóa** (A1) và **điểm nhận hàng** (A2). Cả hai chưa có trong bảng quyết định còn mở.
4. **O07:** ma trận quyền, ít nhất cho các thao tác liên quan đến tiền (B6).
5. **O08 / O09:** cửa sổ attribution và cách truy cập báo cáo đối tác (C2, B4).
6. **O01:** ngôn ngữ ra mắt và cách hiển thị tiền tệ (A3).

Các mục O còn lại có thể quyết trong lúc pilot mà không chặn bản dựng đầu tiên.
