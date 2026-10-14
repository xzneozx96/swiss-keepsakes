# Swiss Stories & Gifts
## Tài liệu yêu cầu sản phẩm PRD v1

Ngày lập: 10 tháng 10 năm 2026. Ngôn ngữ tài liệu: tiếng Việt. Đối tượng sử dụng: Hoàng và đội nền tảng, đối tác Luzern, thiết kế, kỹ thuật và vận hành.

Mục tiêu của phiên bản này là biến 28 quyết định brainstorming thành phạm vi sản phẩm có thể thảo luận với đối tác và dùng để lập backlog. MVP là cửa hàng trực tuyến bằng tiếng Anh, phục vụ du khách theo đoàn và tự túc, với một đối tác chính tại Luzern. Mỗi sản phẩm có thông tin nguồn gốc hoặc ý nghĩa; khách có thể cá nhân hóa, đặt trước và chọn cách nhận phù hợp với lịch trình. Đối tác là người bán, tự quản lý danh mục và đơn hàng; nền tảng nhận hoa hồng hoặc phí dịch vụ.

PRD v1 là bản đặc tả để rà soát. Các lựa chọn sản phẩm đã chốt không đồng nghĩa với việc đối tác đã cam kết năng lực, hợp đồng đã ký hoặc mô hình thanh toán đã được nhà cung cấp chấp thuận. Những phần triển khai được bổ sung trong tài liệu vẫn cần duyệt trước khi trở thành yêu cầu phát triển.

### Quy ước trạng thái

| Nhãn | Ý nghĩa | Cách sử dụng |
| --- | --- | --- |
| CHỐT | Lựa chọn được người dùng xác nhận trong brainstorming | Có mã D01 đến D28 và dẫn về câu hỏi tương ứng |
| GIẢ ĐỊNH | Nhận định chưa có bằng chứng kiểm chứng | Có mã A, phép kiểm chứng và chủ thể phụ trách đề xuất |
| MỞ | Điều khoản, tham số hoặc cách xử lý chưa được quyết định | Có mã O, người cần quyết định và tác động |
| ĐX NGUỒN | Đề xuất của ChatGPT trong cuộc trò chuyện, chưa được người dùng duyệt | Không coi là CHỐT dù xuất hiện trong phần tổng hợp của trợ lý |
| ĐX MỚI | Chi tiết mới của PRD, chưa được người dùng duyệt | Có mã N; bao gồm các tiêu chí nghiệm thu và yêu cầu kỹ thuật bổ sung |

Mọi phần mang nhãn ĐX MỚI hoặc ĐX NGUỒN là đề xuất, không phải phê duyệt ngầm. Các ví dụ số tiền, giá, số lượng sản phẩm và lịch triển khai trong brainstorming không phải cam kết thương mại.

## 1 Tầm nhìn sản phẩm và vấn đề cần giải quyết

**CHỐT D05, D06, D07, D13, D14.** Swiss Stories & Gifts giúp du khách mang về món quà có ý nghĩa gắn với chuyến đi Thụy Sĩ. Trải nghiệm chính là mua quà; thông tin địa phương và câu chuyện sản phẩm tạo lý do để lựa chọn. Thương hiệu hướng đến toàn Thụy Sĩ, còn hoạt động chuẩn bị, khắc và giao nhận ban đầu tập trung tại Luzern.

Du khách có ít thời gian mua sắm, cần biết món quà có gì đáng nhớ, cá nhân hóa được hay không và có thể nhận trước khi rời địa phương hay không. Guide cần hỗ trợ khách mà không khiến cả đoàn phải chờ từng giao dịch. Đối tác cần đơn hàng rõ ràng về sản phẩm, nội dung khắc, thời điểm và người nhận. Đây là vấn đề được mô tả trong concept ban đầu; mức độ phổ biến và tác động thương mại vẫn thuộc GIẢ ĐỊNH A01 đến A04.

Lời hứa sản phẩm là giúp khách chọn quà có thông tin ý nghĩa, nhập đúng nội dung cá nhân hóa, biết điều kiện đặt hàng và nhận theo lịch đã xác nhận. Website không được khiến khách hiểu rằng phạm vi thương hiệu toàn Thụy Sĩ đồng nghĩa với dịch vụ giao nhận đã phủ toàn quốc.

**ĐX MỚI N01.** Đo thành công bằng số đơn đã thanh toán và được bàn giao đúng hẹn, đi kèm biên đóng góp dương. Lượt đọc tạp chí là chỉ số hỗ trợ khám phá, không thay thế kết quả giao dịch và fulfillment.

## 2 Sổ truy vết đầy đủ 28 quyết định

Nguồn S1 là cuộc trò chuyện chia sẻ “Brainstorming Workflow Availability”. Số D tương ứng số câu hỏi brainstorming, không phải số thứ tự tin nhắn. Những trích đoạn ngắn dưới đây là lựa chọn của người dùng; cột áp dụng mô tả cách đưa lựa chọn đó vào PRD.

| Mã | Lựa chọn đã xác nhận | Áp dụng và giới hạn |
| --- | --- | --- |
| D01 | “cả khách theo đoàn và khách tự túc ngay từ đầu” | Storefront phục vụ cả hai nhóm; chưa có tỷ trọng khách mục tiêu |
| D02 | “đặt cả trước và trong chuyến đi” | Hỗ trợ đặt sớm và nhu cầu trong chuyến đi; lịch khả dụng phụ thuộc đối tác |
| D03 | “khắc nhanh từ hàng có sẵn” và “đặt trước nhiều ngày” | Có thời gian chuẩn bị khác nhau theo sản phẩm; chưa chốt lead time thực tế |
| D04 | “nhiều hình thức nhận hàng tùy theo lịch trình khách” | Fulfillment linh hoạt; chưa chốt tất cả phương thức phải có ngay ngày ra mắt |
| D05 | “câu chuyện địa phương và ý nghĩa của món quà” là giá trị cốt lõi | Nội dung có ý nghĩa là thành phần của sản phẩm, chưa có bằng chứng tăng chuyển đổi |
| D06 | Tạp chí độc lập, câu chuyện riêng cho sản phẩm, khám phá quà qua nội dung | Có hai loại nội dung và khả năng liên kết; mức độ tích hợp cụ thể chưa duyệt |
| D07 | “tôi chọn B cho câu hỏi số 7” | Phương án B là cửa hàng quà tặng kể chuyện, shop-first; không phải magazine-first |
| D08 | Guide “giới thiệu, hỗ trợ đặt hàng hoặc gom đơn tùy từng trường hợp” | Vai trò linh hoạt trong tầm nhìn; MVP theo D11 |
| D09 | “hoa hồng giới thiệu và chính sách riêng cho guide hoặc công ty tour” | Hỗ trợ mô hình hợp tác khác nhau; tỷ lệ và cách tránh trùng hoa hồng còn mở |
| D10 | Thanh toán riêng từng khách và tập trung qua guide hoặc công ty tour | Nhu cầu dài hạn đã chốt; không tự động đưa checkout theo đoàn vào MVP |
| D11 | “khách tự đặt và thanh toán, guide chỉ hỗ trợ và giới thiệu trong MVP” | Luồng ưu tiên MVP là khách tự thực hiện giao dịch |
| D12 | “kể chuyện ngay trên từng trang sản phẩm, tạp chí có ít bài lúc đầu” | Product-first storytelling; số bài và nội dung cụ thể còn mở |
| D13 | “du khách quốc tế sử dụng tiếng Anh” | English-first; PRD tiếng Việt không đổi ngôn ngữ sản phẩm |
| D14 | “thương hiệu về toàn Thụy Sĩ”, ban đầu vận hành tại Luzern | Phân biệt phạm vi thương hiệu và phạm vi phục vụ |
| D15 | “quà phổ thông giá dễ tiếp cận và quà cao cấp” | Danh mục có nhiều mức giá; chưa chốt SKU hoặc khoảng giá |
| D16 | “đối tác Luzern là người bán”, nền tảng nhận hoa hồng hoặc phí dịch vụ | Mô hình marketplace theo định hướng thương mại; trách nhiệm pháp lý và thuế cần xác minh |
| D17 | Payment provider tự động phân bổ dòng tiền giữa nền tảng và đối tác | Yêu cầu đầu ra đã chốt; chưa chọn provider hoặc loại charge |
| D18 | “tổng hợp hoa hồng và thanh toán định kỳ cho tour guide” | Settlement guide là nghiệp vụ riêng; chưa chốt chu kỳ và mức tự động hóa chuyển tiền |
| D19 | Partner Dashboard đơn giản để quản lý và cập nhật trạng thái đơn | Portal là thành phần MVP; UI và trạng thái chi tiết là đề xuất |
| D20 | Đối tác tự quản lý sản phẩm, giá, tồn kho và thời gian chuẩn bị | Đối tác sở hữu dữ liệu thương mại và khả năng đáp ứng |
| D21 | Đối tác tự tạo và xuất bản, không cần nền tảng phê duyệt | Không thêm bước admin duyệt trước khi xuất bản |
| D22 | Đối tác tự viết và chịu trách nhiệm toàn bộ câu chuyện sản phẩm | Không mặc định AI viết hoặc đội nền tảng duyệt câu chuyện sản phẩm |
| D23 | Mọi sản phẩm có nguồn gốc hoặc ý nghĩa, không bắt buộc câu chuyện dài | Làm rõ chuẩn tối thiểu của D12; không ép viết dài |
| D24 | Đã có đối tác Luzern, đang trao đổi điều khoản cụ thể | Sự tồn tại đối tác đã xác nhận; hợp đồng và năng lực chưa được xem là đã cam kết |
| D25 | “một đối tác chính tại Luzern khi ra mắt MVP” | Một đối tác vận hành lúc ra mắt; chưa yêu cầu marketplace nhiều seller hoàn chỉnh |
| D26 | Standard tự động xác nhận; special xác nhận thủ công | Có hai luồng xác nhận; ngưỡng phân loại cần chốt |
| D27 | Special chỉ thanh toán sau khi đối tác xác nhận khả năng thực hiện | Không thu tiền hoặc giữ tiền trước như luồng mặc định của special |
| D28 | Thời hạn thanh toán cố định, “ví dụ 24 giờ sau khi đối tác xác nhận” | Quy tắc thời hạn cố định đã chốt; 24 giờ được dùng làm giá trị dự thảo, cần xác nhận tham số ra mắt |

### Cách xử lý những điểm dễ hiểu nhầm

D08 và D10 mô tả độ linh hoạt của sản phẩm dài hạn. D11 xác định luồng ưu tiên của MVP. Việc hoãn tự động hóa đơn nhóm là phạm vi đề xuất của PRD, không xóa nhu cầu đã chốt.

D12 ưu tiên thông tin có ý nghĩa ngay trên trang sản phẩm. D22 giao trách nhiệm viết cho đối tác. D23 làm rõ chuẩn tối thiểu là nguồn gốc hoặc ý nghĩa, không bắt buộc một bài kể chuyện dài cho mọi sản phẩm.

Trợ lý nguồn diễn giải D28 thành chính xác 24 giờ. Người dùng dùng từ “ví dụ”, vì vậy PRD giữ thời hạn cố định là CHỐT và ghi giá trị 24 giờ ở O06 để xác nhận. Đề xuất của trợ lý nguồn về rút ngắn thời hạn khi khách cần nhận gấp chưa được duyệt và không được âm thầm áp dụng.

## 3 Personas và jobs to be done

Các vai trò xuất phát từ D01, D08, D16 và concept ban đầu. Mô tả động cơ và hành vi sau đây là GIẢ ĐỊNH A01 đến A06, cần kiểm chứng; không phải chân dung khách hàng đã được nghiên cứu.

| Persona | Tình huống và nhu cầu | JTBD và dấu hiệu thành công |
| --- | --- | --- |
| Du khách tự túc | Chuẩn bị chuyến đi hoặc đang ở Luzern; muốn mua quà có ý nghĩa và không lỡ lịch di chuyển | Khi cần quà cho người thân, tôi muốn biết ý nghĩa, khả năng khắc và lịch nhận để đặt đúng món và nhận kịp chuyến đi |
| Du khách theo đoàn | Nhận link từ guide; cần tự chọn quà và kiểm tra tên người nhận | Khi đoàn có lịch cố định, tôi muốn tự đặt và trả tiền trước để nhận quà thuận lịch mà không bắt cả đoàn chờ |
| Tour guide | Giới thiệu, giải thích lựa chọn, giúp kiểm tra nội dung khắc, phối hợp bàn giao | Khi khách muốn mua quà, tôi muốn gửi link được ghi nhận và hỗ trợ theo nhu cầu để khách mua thuận tiện và hoa hồng được đối soát |
| Đối tác Luzern | Bán hàng, quản lý tồn kho, khắc và giao nhận | Khi có đơn, tôi muốn biết chính xác yêu cầu và hạn bàn giao để chuẩn bị đúng, cập nhật tiến độ và đối chiếu doanh thu |
| Hoàng và đội nền tảng | Vận hành website, tạp chí, referral và quan hệ đối tác | Khi có sự cố hoặc kỳ thanh toán, tôi muốn truy vết đơn và dòng tiền để xử lý và giải thích được số liệu với các bên |

**ĐX MỚI N02.** Khi nghiên cứu, tách người chọn món, người thanh toán, người nhận hàng và người có tên được khắc. Không coi tên khắc là danh tính khách mua. Không cần thu thông tin người nhận quà ngoài nội dung cá nhân hóa nếu nghiệp vụ không yêu cầu.

## 4 Hành trình người dùng

### 4.1 Khách tự đặt standard order

**CHỐT D02, D11, D26.** Khách đến qua guide, tìm kiếm hoặc nội dung; xem sản phẩm, đọc thông tin ý nghĩa; chọn biến thể và cá nhân hóa; chọn lịch và phương thức nhận; tự thanh toán. Khi đáp ứng điều kiện standard và thanh toán thành công, hệ thống xác nhận tự động, đối tác chuẩn bị và bàn giao.

**ĐX MỚI N03.** Trước thanh toán, khách xem lại nguyên văn nội dung khắc, số lượng, tổng tiền, điểm nhận và thời gian địa phương. Nếu lịch không khả dụng, hệ thống giải thích và cho chọn lịch khác. Sau thanh toán, khách nhận mã đơn và hướng dẫn nhận, không phải đặt lại khi mất kết nối.

### 4.2 Khách gửi special order

**CHỐT D26, D27, D28.** Khách gửi yêu cầu chưa thanh toán. Đối tác xác nhận khả năng thực hiện trước khi khách được thanh toán. Sau xác nhận, khách có một thời hạn cố định để trả tiền. Nếu trả tiền trong hạn, đơn chuyển sang chuẩn bị.

**ĐX NGUỒN.** Đối tác xác nhận cả giá, nội dung và lịch nhận; báo giá được lưu để tránh thay đổi khi khách trả tiền; yêu cầu không thanh toán sẽ hết hạn. **ĐX MỚI N04.** Khách thấy rõ “yêu cầu đã được chấp nhận, đang chờ thanh toán” và “đơn đã thanh toán”, vì đây là hai sự kiện khác nhau. Nếu bị từ chối, khách biết lý do và phương án thay thế, nếu có.

### 4.3 Khách theo đoàn và guide

**CHỐT D08, D09, D11.** Guide gửi link giới thiệu và có thể giúp khách lựa chọn, kiểm tra tên khắc. Khách tự đặt, tự trả tiền trong MVP. Hệ thống ghi nhận nguồn giới thiệu để tổng hợp hoa hồng định kỳ.

**ĐX MỚI N05.** Cho liên kết nhiều đơn độc lập với một mã chuyến hoặc nhóm bàn giao nếu đối tác xác nhận khả thi. Gom giao nhận không đổi người thanh toán và không biến những đơn chưa trả tiền thành đơn được chuẩn bị. Guide chỉ xem dữ liệu cần thiết để bàn giao, theo quyền được xác nhận.

### 4.4 Từ tạp chí đến món quà

**CHỐT D06, D07, D12.** Khách có thể đọc bài về Luzern, Finsterwald, cung đèo hoặc đời sống Thụy Sĩ, rồi khám phá quà. Khách cũng có thể vào sản phẩm trước và đọc thông tin nguồn gốc, ý nghĩa ngay trên trang bán hàng.

**ĐX NGUỒN.** Liên kết bài viết và sản phẩm có liên quan. **ĐX MỚI N06.** Bài viết không phụ thuộc việc sản phẩm còn hàng; khi món quà ngừng bán, bài vẫn đọc được và phần gợi ý bán hàng không dẫn tới checkout không khả dụng.

## 5 Phạm vi MVP và những gì chưa làm

### 5.1 Năng lực cốt lõi đã chốt

Storefront English-first phục vụ khách theo đoàn và tự túc; danh mục quà phổ thông và cao cấp; thông tin nguồn gốc hoặc ý nghĩa trên mọi sản phẩm; cá nhân hóa, đặt trước, lịch nhận phù hợp khả năng đối tác; tạp chí có ít bài lúc đầu; khách tự đặt và thanh toán; standard xác nhận tự động và special xác nhận thủ công, thanh toán sau xác nhận với hạn cố định; một đối tác chính tại Luzern có portal để tự quản lý danh mục, xuất bản và xử lý đơn; payment provider phân bổ doanh thu giữa đối tác và nền tảng; ghi nhận và tổng hợp hoa hồng guide để thanh toán định kỳ.

Danh sách trên tổng hợp D01 đến D28, nhưng không chốt số SKU, phương thức nhận cụ thể, loại payment provider hoặc lịch ra mắt.

### 5.2 Đề xuất ranh giới triển khai

**ĐX MỚI N07.** MVP có storefront, partner portal, admin vận hành tối thiểu và công cụ referral/đối soát. Chỉ bật phương thức nhận đã thỏa thuận với đối tác. Chuẩn bị đủ khả năng xử lý refund và sự cố trước khi nhận tiền thật, dù số lượng đơn ban đầu thấp.

| Hạng mục | Phạm vi MVP đề xuất | Giới hạn và việc sau MVP |
| --- | --- | --- |
| Đơn lẻ và cá nhân hóa | Một đơn thuộc một đối tác; nhiều dòng sản phẩm có nội dung khắc riêng | Đơn nhiều seller và tách checkout chưa làm |
| Hình thức nhận | Cấu hình các hình thức được đối tác cam kết | Không mặc định giao toàn Thụy Sĩ hoặc giao quốc tế |
| Guide | Link giới thiệu, hỗ trợ khách, bảng đối soát | Portal guide đầy đủ là đề xuất giai đoạn sau |
| Đơn nhóm | Khách trả riêng; liên kết bàn giao nếu được duyệt N05 | Tạo đơn chung và thanh toán tập trung chưa phải luồng MVP ưu tiên |
| Payout guide | Ghi nhận, đối soát theo kỳ, lưu kết quả chi trả | Tự động chuyển khoản hoàn toàn chưa được chốt |
| Editorial | Tạp chí độc lập nhỏ; nội dung sản phẩm do đối tác viết | Không thêm AI viết tự động, dịch toàn bộ nhiều ngôn ngữ hoặc thẻ QR mặc định |
| Quản trị | Tra cứu đơn, sự cố, refund, đối soát, tạp chí | Không thêm bước phê duyệt xuất bản sản phẩm trái D21 |

**ĐX MỚI N08.** Non-goals của bản triển khai MVP: ứng dụng di động riêng; ERP/POS tích hợp hai chiều; loyalty và subscription; giao hàng quốc tế; mua bán tồn kho bởi nền tảng; marketplace nhiều seller hoàn chỉnh; thiết kế khắc trực quan 3D; quản lý tour chuyên biệt; CMS đa ngôn ngữ đầy đủ. Đây là đề xuất giới hạn đầu tư, chưa phải phủ nhận nhu cầu tương lai.

## 6 Yêu cầu storefront

Mã SF là yêu cầu chức năng. “Cốt lõi CHỐT” nói đến năng lực được chọn; chi tiết nghiệm thu và cách hiển thị là ĐX MỚI, cần duyệt cùng backlog.

### SF01 Khám phá danh mục và thông tin sản phẩm

**Cốt lõi CHỐT D07, D12, D13, D15, D23.** Storefront ưu tiên mua quà, bằng tiếng Anh, có sản phẩm ở các phân khúc giá. Mỗi trang có thông tin nguồn gốc hoặc ý nghĩa và lựa chọn mua.

**ĐX MỚI N09.** Trang sản phẩm có ảnh, tên, mô tả vật lý, giá/biến thể, khả năng cá nhân hóa, thời gian chuẩn bị, phương thức nhận và thông tin người bán. Tách nơi sản xuất thực tế khỏi địa danh truyền cảm hứng; không dùng “Swiss-made” khi không có thông tin xác thực. Bộ lọc giá và khả năng cá nhân hóa là tiện ích đề xuất, không phải điều kiện bắt buộc ra mắt.

### SF02 Cá nhân hóa và kiểm tra nội dung

**Cốt lõi CHỐT D03, D11.** Khách nhập lựa chọn cá nhân hóa cho sản phẩm được đối tác hỗ trợ. **ĐX MỚI N10.** Mỗi dòng hàng lưu nội dung khắc riêng; biểu mẫu hiển thị giới hạn ký tự, kiểu chữ hoặc ký tự hỗ trợ do đối tác cung cấp. Khách xác nhận nội dung trước khi thanh toán hoặc gửi yêu cầu. Hệ thống không tự sửa tên, bỏ dấu hoặc dịch nội dung khắc. Preview hình ảnh chỉ thêm khi được duyệt và đối tác có dữ liệu phù hợp.

### SF03 Chọn lịch và phương thức nhận

**Cốt lõi CHỐT D02, D03, D04, D14.** Lịch nhận dựa trên thời gian chuẩn bị, tồn kho và năng lực đối tác. **ĐX MỚI N11.** Hiển thị ngày/giờ theo Europe/Zurich và ghi rõ múi giờ. Chỉ đưa ra các phương thức và khung giờ được bật. Xử lý ngày nghỉ, cutoff và lịch đóng cửa theo cấu hình được đối tác xác nhận. Điểm nhận phải có địa chỉ hoặc hướng dẫn đủ để khách tìm đến; phí nhận/giao, nếu có, xuất hiện trước thanh toán.

### SF04 Giỏ hàng và checkout

**Cốt lõi CHỐT D11, D17, D26, D27.** Khách tự thanh toán standard; special được gửi dưới dạng yêu cầu rồi thanh toán sau xác nhận. **ĐX MỚI N12.** MVP tách standard và special thành giao dịch/yêu cầu riêng nếu cùng giỏ, có thông báo rõ trước khi khách tiếp tục. Không thu tiền phần special chưa được đối tác chấp nhận. Checkout hiển thị tổng tiền, người bán, nội dung khắc, lịch nhận, điều khoản áp dụng và nguồn giới thiệu nếu liên quan. Guest checkout và tra cứu bằng liên kết riêng là đề xuất để giảm bước đăng ký; tài khoản khách chưa được chốt.

### SF05 Theo dõi và hỗ trợ sau đặt

**ĐX MỚI N13, phục vụ D19 và D26 đến D28.** Khách xem trạng thái yêu cầu/đơn, hạn thanh toán, kết quả thanh toán và hướng dẫn nhận. Có kênh yêu cầu hỗ trợ về sai tên, đổi lịch, hủy hoặc hàng lỗi. Chính sách đủ điều kiện đổi/hủy/refund phải được chốt ở O07; việc có kênh liên hệ không mặc định cho phép khách sửa đơn đã khắc.

## 7 Yêu cầu partner portal

### PP01 Truy cập và quyền quản lý

**Cốt lõi CHỐT D19, D20, D25.** Đối tác Luzern có trang quản lý riêng. **ĐX MỚI N14.** Có đăng nhập, phân quyền tối thiểu giữa người quản lý danh mục và người xử lý đơn nếu đối tác có nhiều nhân viên. Quyền xem dữ liệu và điều chỉnh tiền phải được duyệt; một nhân viên không mặc định có mọi quyền tài chính.

### PP02 Danh mục và xuất bản

**CHỐT D20, D21, D22, D23.** Đối tác tạo/sửa sản phẩm, giá, tồn kho, thời gian chuẩn bị, tự viết nội dung và xuất bản trực tiếp. Không có hàng đợi duyệt của nền tảng.

**ĐX NGUỒN.** Kiểm tra thông tin bắt buộc và tiêu chuẩn ảnh/nội dung. **ĐX MỚI N15.** Trạng thái sản phẩm gồm nháp, đang bán và ngừng bán; biểu mẫu chặn xuất bản nếu chưa có nguồn gốc hoặc ý nghĩa. Kiểm tra biểu mẫu là quy tắc tự động, không thay thế bằng phê duyệt thủ công. Sửa giá hoặc nội dung không thay đổi đơn đã thanh toán hoặc báo giá còn hiệu lực. Admin ẩn sản phẩm vi phạm là quyền đề xuất cần ghi trong thỏa thuận, chưa được D21 tự động cho phép.

### PP03 Tồn kho và năng lực chuẩn bị

**Cốt lõi CHỐT D03, D20, D26.** Đối tác cập nhật số lượng và lead time. **ĐX MỚI N16.** Phân biệt tồn thực tế, số đã giữ cho đơn và số còn bán. Nếu hàng tại cửa hàng bán offline, đối tác cần quy trình cập nhật hoặc dành một quota cho website. Portal cho tạm ngừng nhận đơn hoặc khóa một ngày quá tải. Không giả định có đồng bộ POS trong MVP.

### PP04 Đơn và special requests

**Cốt lõi CHỐT D19, D26, D27.** Đối tác xem sản phẩm, số lượng, cá nhân hóa, lịch nhận; cập nhật tiến độ; quyết định khả năng đáp ứng special. **ĐX MỚI N17.** Special có thao tác chấp nhận hoặc từ chối kèm lý do. Khi chấp nhận, xác nhận giá và lịch nhận trước khi phát hành yêu cầu thanh toán. Không yêu cầu đối tác xác nhận thủ công mọi standard đã được tự động xác nhận. Danh sách đơn có ưu tiên theo hạn cần chuẩn bị và cảnh báo các đơn sắp nhận chưa sẵn sàng.

### PP05 Bàn giao và báo cáo

**ĐX MỚI N18.** Đối tác đánh dấu sẵn sàng, ghi nhận bàn giao thực tế, thời gian, người nhận và bằng chứng tối thiểu đã thỏa thuận. Có báo cáo đơn, doanh thu bán hàng, refund và phần tiền dự kiến/đã nhận. Portal không hiển thị payout thành công chỉ vì provider đã phân bổ tiền trong số dư.

## 8 Yêu cầu admin và referral

### AD01 Vận hành đơn và sự cố

**ĐX MỚI N19.** Admin tra cứu đơn và lịch sử sự kiện, yêu cầu special, payment, refund và bàn giao. Admin ghi chú xử lý sự cố, theo dõi tác vụ tồn đọng, gửi lại thông báo khi cần. Mọi thay đổi có ảnh hưởng tiền hoặc cam kết nhận hàng cần lưu người thực hiện, lý do và thời điểm. Không cho sửa âm thầm đơn đã trả tiền.

### AD02 Cấu hình và đối soát

**ĐX MỚI N20.** Admin quản lý tài khoản đối tác/guide, chính sách commission có phiên bản và hiệu lực, phương thức nhận, mẫu thông báo, bảng đối soát và trạng thái chi trả. Thay đổi chính sách không tự tính lại đơn cũ nếu chưa có quy tắc được duyệt. Admin xuất dữ liệu cần thiết cho kế toán; không xây hệ thống kế toán hoàn chỉnh trong MVP.

### RF01 Ghi nhận nguồn giới thiệu

**Cốt lõi CHỐT D09, D11, D18.** Ghi nhận đơn được guide giới thiệu và tổng hợp hoa hồng. **ĐX MỚI N21.** Mỗi guide có link/mã riêng; lưu nguồn theo đơn và chính sách áp dụng. Phải quyết định cửa sổ attribution, ưu tiên khi có nhiều link, hỗ trợ đổi thiết bị và cách xử lý mất mã tại O08. Một lượt truy cập chưa phải commission phải trả. Không mặc định một đơn nhận cả hoa hồng guide lẫn chiết khấu công ty nếu chưa có thỏa thuận.

### RF02 Đối soát và chi trả định kỳ

**Cốt lõi CHỐT D18.** Hệ thống tổng hợp hoa hồng và hỗ trợ chi trả theo kỳ. **ĐX NGUỒN.** Theo dõi pending, approved, paid và cancelled/adjusted. **ĐX MỚI N22.** Đối soát ghi nhận cơ sở tính, tỷ lệ/số tiền, refund, điều chỉnh và chứng từ chi trả. Chỉ trạng thái có bằng chứng giao dịch chi trả mới được ghi “paid”. Nếu tiền chưa chuyển thành công, khoản phải trả vẫn còn. Guide nhận bảng đối soát phù hợp quyền truy cập, bằng file hoặc trang tối thiểu; portal guide đầy đủ chưa được chốt.

## 9 Luồng standard orders

**CHỐT D26.** Standard được xác nhận tự động sau thanh toán khi đáp ứng quy tắc của đối tác. Hàng cần chuẩn bị nhiều ngày không tự động đồng nghĩa với special; quyết định phân loại còn phụ thuộc khả năng cam kết.

**ĐX MỚI N23.** Luồng trạng thái dự thảo:

1. Khách chọn sản phẩm, cá nhân hóa và lịch nhận. Hệ thống kiểm tra giá, tồn kho, thời gian chuẩn bị và phương thức nhận.
2. Tạo phiên thanh toán và giữ khả năng đáp ứng trong một thời gian xác định ở O05. Khi khách bỏ dở hoặc thất bại, giải phóng phần giữ theo chính sách được duyệt.
3. Payment provider báo thanh toán thành công; hệ thống kiểm tra kết quả đáng tin cậy và xác nhận đơn đúng một lần.
4. Đơn CONFIRMED chuyển sang PREPARING, READY rồi COMPLETED khi bàn giao thực tế.
5. Sự cố sau thanh toán đi vào xử lý riêng; hủy và refund là các sự kiện khác nhau và phải có kết quả cụ thể.

Các ngoại lệ phải được đặc tả trong backlog: tồn cuối cùng bị nhiều khách mua cùng lúc; giá thay đổi khi checkout đang mở; payment thành công nhưng thông báo chậm; khách đóng trình duyệt sau trả tiền; đối tác không đáp ứng được dù đã tự động xác nhận. Quy trình refund và trách nhiệm bồi hoàn còn ở O07.

## 10 Luồng special orders và thời hạn thanh toán

**CHỐT D26 đến D28.** Special có bước đối tác xác nhận trước thanh toán và một hạn thanh toán cố định tính từ xác nhận. Giá trị minh họa 24 giờ được giữ trong bản mô phỏng nghiệp vụ; O06 chốt giá trị dùng khi ra mắt.

**ĐX MỚI N24.** Luồng trạng thái dự thảo:

1. REQUESTED: khách gửi sản phẩm, số lượng, nội dung cá nhân hóa, lịch mong muốn và phương thức nhận; chưa thu hoặc giữ tiền.
2. PARTNER_REVIEW: đối tác kiểm tra khả năng và giá. Thời gian phản hồi chưa chốt tại O04.
3. REJECTED nếu không đáp ứng; hoặc APPROVED_AWAITING_PAYMENT nếu chấp nhận. Lưu phiên bản báo giá và thời điểm approved_at.
4. payment_due_at = approved_at + thời hạn cố định. Trong minh họa dùng 24 giờ. Khách thấy hạn cụ thể theo giờ Luzern.
5. PAID_CONFIRMED nếu thanh toán hợp lệ trong hạn, sau đó PREPARING, READY và COMPLETED.
6. EXPIRED nếu hết hạn chưa có thanh toán hợp lệ. Liên kết cũ không tạo giao dịch mới; mở lại cần một lần xác nhận mới theo chính sách được duyệt.

Đóng yêu cầu khi hết hạn và vô hiệu link cũ là ĐX NGUỒN. Cách đặt giữ tồn kho/công suất trong cửa sổ chờ trả tiền là MỞ O05. Không bắt đầu khắc chỉ vì đối tác đã chấp nhận yêu cầu là ĐX MỚI N24, cần đối tác đồng ý.

### Xung đột giữa hạn thanh toán và giờ nhận

Nếu đối tác xác nhận lúc 15:00 và khách muốn nhận lúc 10:00 sáng hôm sau, hạn 24 giờ có thể đến sau giờ nhận, còn thời gian sản xuất cũng cần được tính. Không thể hứa cùng lúc cả lịch nhận này và toàn bộ cửa sổ 24 giờ mà không có chính sách bổ sung.

**MỞ O06.** Chọn cách xử lý trước ra mắt: từ chối lịch quá gần và đề xuất lịch khác; hoặc có ngoại lệ thời hạn được khách chấp thuận rõ. Phương án rút ngắn tự động trong nguồn là ĐX NGUỒN, chưa được duyệt. PRD không tự chọn thay người dùng.

**ĐX MỚI N25.** Quy tắc cạnh tranh tại thời điểm hết hạn: đánh giá thời điểm thanh toán theo dữ liệu provider được xác minh, không chỉ thời điểm webhook đến. Thanh toán hoàn tất trước hạn nhưng webhook đến muộn phải được đối chiếu; thanh toán bắt đầu trước hạn nhưng hoàn tất sau hạn đi vào xử lý ngoại lệ. Chọn chỉ phương thức thanh toán phù hợp với cửa sổ này hoặc chốt cách xử lý phương thức chậm tại O09.

## 11 Thanh toán phân bổ doanh thu và payout

### 11.1 Mô hình đã chọn và lựa chọn còn mở

**CHỐT D16, D17, D18.** Đối tác là người bán theo định hướng hợp tác; nền tảng nhận phí/hoa hồng; payment provider tự động phân bổ doanh thu giữa hai bên. Hoa hồng guide được tổng hợp và thanh toán định kỳ, không mặc định chia ngay từ mọi giao dịch.

**ĐX NGUỒN.** Stripe Connect là ứng viên nghiên cứu, chưa phải provider được chọn. Tài liệu chính thức của Stripe phân biệt direct charges, destination charges và separate charges and transfers; loại charge ảnh hưởng dòng tiền và tài khoản bị trừ khi refund hoặc dispute. Vì vậy D16 không đủ để chốt loại charge. Xem S2.

**MỞ O01, O02, O03, O09.** Cần xác minh pháp nhân của nền tảng và đối tác, nơi đăng ký, tài khoản ngân hàng, khả năng onboarding/KYC, phương thức trả tiền, đồng tiền, phí, bên chịu refund/dispute và điều kiện chuyển tiền. CHF là đồng tiền đề xuất trong nguồn, chưa phải lựa chọn được người dùng xác nhận riêng. Không suy luận trách nhiệm VAT chỉ từ chữ marketplace.

### 11.2 Phân biệt những mốc tiền

**ĐX MỚI N26.** Theo dõi riêng: khách thanh toán; provider phân bổ/transfer; tiền khả dụng trong số dư; payout về tài khoản ngân hàng; khoản commission guide phải trả; commission đã thực trả. Một khoản đã phân bổ chưa đồng nghĩa đối tác đã nhận tiền trong ngân hàng. Lịch payout và tình trạng tài khoản là phần cần xác minh với provider; xem S3.

### 11.3 Sổ giao dịch và đối soát

**ĐX MỚI N27.** Mỗi đơn có tổng tiền khách trả, giá hàng, phí nhận/giao, thuế nếu áp dụng, phí provider thực tế, phần của đối tác, phí nền tảng, hoa hồng guide và điều chỉnh/refund. Gắn mã giao dịch provider, mã refund, transfer và payout khi có.

Phí nền tảng và commission guide có thể cùng liên quan một đơn nhưng không được coi là cùng một khoản. Chưa biết commission guide được đối tác hay nền tảng tài trợ. Không dùng công thức “giá bán trừ mọi khoản” nếu chưa xác định ai trả từng khoản và cơ sở tính thuế.

**ĐX MỚI N28.** Sổ vận hành chỉ dùng số tiền thực tế và chính sách được duyệt; lưu đơn vị tiền nhỏ nhất, quy tắc làm tròn và phiên bản chính sách. Đối soát kiểm tra tổng khoản phân bổ với tiền thu/refund và phần dư đang xử lý. Bất kỳ chênh lệch nào phải giải thích được trước chi trả theo kỳ.

### 11.4 Refund và tranh chấp

**MỞ O07.** Chưa chốt chính sách hủy, đổi lịch, no-show, hàng cá nhân hóa, sai tên do khách, lỗi khắc của đối tác, hàng lỗi và bàn giao muộn. Chưa chốt bên chịu phí provider không hoàn lại, thu hồi phí nền tảng hoặc commission guide đã trả.

**ĐX MỚI N29.** Admin theo dõi refund requested, processing, succeeded và failed độc lập với trạng thái fulfillment. Chỉ báo “đã hoàn tiền” khi kết quả provider xác nhận. Hoàn một phần phải điều chỉnh cơ sở commission theo chính sách; nếu đã trả guide thì ghi khoản điều chỉnh cho kỳ sau hoặc cơ chế thu hồi được thỏa thuận, không xóa lịch sử.

## 12 Fulfillment và trách nhiệm bàn giao

**CHỐT D03, D04, D14, D16, D19.** Đối tác Luzern cung cấp hàng, chất lượng, khắc, chuẩn bị và giao nhận. Khách có nhiều cách nhận phù hợp hành trình. Các cách nhận tại cửa hàng, qua guide, tại khách sạn hoặc điểm hẹn là ĐX NGUỒN, không phải tất cả đã được cam kết.

**ĐX MỚI N30.** Mỗi phương thức nhận cần xác định phạm vi, khung giờ, cutoff, phí, thời gian di chuyển, người thực hiện, điều kiện xác nhận và kênh hỗ trợ. Đối tác xác nhận dữ liệu này trước khi hiển thị trên storefront. Nếu không còn phương thức khả dụng, sản phẩm vẫn có thể được xem nhưng không hứa một lịch nhận không thể thực hiện.

**ĐX MỚI N31.** Bàn giao gồm mã đơn, đối chiếu món và nội dung khắc, kiểm tra người nhận hoặc quyền nhận hộ, thời gian thực tế và xác nhận hoàn tất. QR/OTP là phương án cân nhắc, không phải tính năng đã chốt. Với nhiều đơn cùng đoàn, có thể hoàn tất từng đơn riêng để không ghi cả đoàn đã nhận khi còn thiếu món.

**MỞ O10.** Nếu guide nhận hộ, cần quyết định thời điểm được xem là hoàn thành với khách và thời điểm commission đủ điều kiện. Cần thỏa thuận trách nhiệm sau khi đối tác bàn giao cho guide. **MỞ O11.** Nếu khách đổi lịch tour, đến muộn hoặc không xuất hiện, cần chốt thời gian giữ hàng, phí và khả năng sắp xếp nhận lại.

## 13 Editorial và quản trị nội dung

**CHỐT D06, D12, D22, D23.** Tạp chí hoạt động độc lập, bắt đầu với ít bài. Đối tác tự viết và chịu trách nhiệm câu chuyện sản phẩm; mọi sản phẩm có nguồn gốc hoặc ý nghĩa, không bắt buộc bài dài. Quyết định mới này thay thế giả định ban đầu rằng đội nền tảng phải viết mọi câu chuyện sản phẩm.

**ĐX MỚI N32.** Đội nền tảng quản lý nội dung tạp chí với nháp, xuất bản và lưu phiên bản. Đối tác quản lý nội dung sản phẩm. Những bài có địa danh, lịch sử, nguồn gốc hoặc tuyên bố chất lượng cần có căn cứ phù hợp và quyền sử dụng ảnh. Không biến thông tin “lấy cảm hứng từ Thụy Sĩ” thành “sản xuất tại Thụy Sĩ”.

**ĐX NGUỒN.** Có biểu mẫu gợi ý nội dung và quyền ẩn sản phẩm vi phạm sau xuất bản. **MỞ O12.** Thỏa thuận chuẩn tối thiểu, quyền sửa/ẩn và quy trình khiếu nại mà vẫn giữ D21 không cần duyệt trước. AI viết nội dung, QR/thẻ kể chuyện đi kèm và dịch nhiều ngôn ngữ là phương án chưa duyệt.

## 14 Business rules

| Mã | Quy tắc | Trạng thái và truy vết |
| --- | --- | --- |
| BR01 | Khách tự đặt và thanh toán là luồng ưu tiên MVP; guide giới thiệu/hỗ trợ | CHỐT D11 |
| BR02 | Một đối tác chính tại Luzern khi ra mắt | CHỐT D25 |
| BR03 | Đối tác tự quản lý, viết nội dung và xuất bản sản phẩm không cần duyệt trước | CHỐT D20 đến D22 |
| BR04 | Mọi sản phẩm có nguồn gốc hoặc ý nghĩa; không bắt buộc truyện dài | CHỐT D23 |
| BR05 | Standard tự động xác nhận; special cần đối tác xác nhận | CHỐT D26 |
| BR06 | Special chỉ thu tiền sau xác nhận khả năng; hạn thanh toán cố định từ xác nhận | CHỐT D27, D28; giá trị giờ ở O06 |
| BR07 | Điều kiện standard do đối tác xác định dựa trên tồn kho, lead time và lịch | Cốt lõi D20, D26; ngưỡng cụ thể MỞ O04 |
| BR08 | Không tự biến mọi đơn không khả dụng thành special | ĐX NGUỒN; cần duyệt trong N23/N24 |
| BR09 | Giá và nội dung sửa trong danh mục không đổi đơn cũ/báo giá đang hiệu lực | ĐX MỚI N15, N24 |
| BR10 | Đơn chưa thanh toán không bắt đầu khắc; hết hạn vô hiệu link thanh toán cũ | ĐX MỚI N24 và ĐX NGUỒN |
| BR11 | Mỗi dòng hàng giữ cá nhân hóa riêng; không tự sửa tên | ĐX MỚI N10 |
| BR12 | Nguồn referral và chính sách commission được ghi theo đơn; không mặc định trả trùng | ĐX MỚI N21; attribution MỞ O08 |
| BR13 | Guide được tổng hợp và thanh toán theo kỳ | CHỐT D18; kỳ/ngưỡng MỞ O08 |
| BR14 | Thông báo thanh toán lặp lại không tạo nhiều đơn hoặc nhiều khoản commission | ĐX MỚI N33 |
| BR15 | Hoàn tất bàn giao, refund và payout là trạng thái độc lập | ĐX MỚI N18, N26, N29 |
| BR16 | Chỉ hiển thị lịch và phương thức nhận thực tế đáp ứng được | Chi tiết ĐX MỚI N11, N30; phục vụ D04, D14 |

## 15 Yêu cầu phi chức năng

Toàn bộ mục này là **ĐX MỚI N33 đến N38**, chưa có mức SLA được người dùng hoặc đối tác duyệt. Các ngưỡng là ứng viên nghiệm thu, không phải cam kết vận hành hiện tại.

| Mã | Yêu cầu đề xuất | Cách kiểm tra và giới hạn |
| --- | --- | --- |
| N33 | Tính nhất quán đơn và tiền | Một thanh toán chỉ xác nhận một đơn; webhook lặp/sai thứ tự không thu, phân bổ hoặc ghi commission trùng; có đối soát phục hồi khi mất thông báo |
| N34 | Bảo mật và quyền riêng tư | Kiểm tra quyền với mọi đơn/dữ liệu; không lưu số thẻ/CVV trên nền tảng; bí mật không xuất hiện trong log; chỉ thu dữ liệu cần thiết; thời hạn lưu/xóa ở O13 |
| N35 | Khả dụng và khôi phục | Đề xuất đo availability luồng đặt đơn 99,5% theo tháng, RPO 24 giờ và RTO 4 giờ; cần kiểm tra mức phù hợp với số đơn và hạ tầng trước duyệt |
| N36 | Hiệu năng và mobile | Đề xuất p75 LCP trang sản phẩm dưới 2,5 giây trên tập thiết bị/mạng đã thống nhất; giữ dữ liệu khắc khi gặp lỗi kiểm tra; quy mô tải thử ở O14 |
| N37 | Khả năng tiếp cận và ngôn ngữ | Đề xuất WCAG 2.2 AA cho luồng cốt lõi; bàn phím, nhãn input, lỗi và trạng thái đọc được; English-first; giờ nhận theo Europe/Zurich có xử lý đổi giờ mùa hè |
| N38 | Quan sát và hỗ trợ | Log/audit có mã đơn và giao dịch, che dữ liệu nhạy cảm; cảnh báo payment thành công chưa có đơn, refund lỗi, payout lỗi, special quá hạn; kiểm thử sao lưu/khôi phục trước ra mắt |

## 16 Acceptance criteria

Tất cả AC dưới đây là **ĐX MỚI**, diễn giải để kiểm thử những năng lực đã chốt. Chỉ đưa vào kế hoạch nghiệm thu chính thức sau khi quyết định các O liên quan. Chưa có phần mềm được kiểm thử trong phạm vi PRD này.

| Mã | Tình huống kiểm thử | Kết quả cần đạt | Liên quan |
| --- | --- | --- | --- |
| AC01 | Khách theo đoàn và tự túc vào storefront | Cả hai có thể chọn quà và tự đặt; không bắt buộc có guide để mua | D01, D11; SF01 |
| AC02 | Đối tác đăng sản phẩm không có nguồn gốc hoặc ý nghĩa | Biểu mẫu nêu thiếu dữ liệu; khi đủ dữ liệu thì xuất bản trực tiếp, không chờ admin duyệt | D21, D23; N15 |
| AC03 | Một đơn có hai món khắc tên khác nhau | Nội dung từng món giữ nguyên tại checkout, đơn và portal; không dùng chung một tên mặc định | D03; N10 |
| AC04 | Khách muốn nhận trước lead time hoặc ngày đã đóng | Không cam kết lịch đó; hiển thị lịch hợp lệ hoặc lý do không đặt được | D02, D20; N11 |
| AC05 | Standard đủ điều kiện, payment thành công | Xác nhận tự động đúng một lần; đối tác thấy đơn; không cần thêm lần chấp nhận thủ công | D26; N23, N33 |
| AC06 | Hai khách mua đơn vị tồn cuối cùng | Không bán vượt tồn khả dụng; người không được giữ hàng có kết quả rõ và không bị thu tiền sai | D20; N16, N23 |
| AC07 | Khách gửi special, đối tác chưa xác nhận | Không thu/giữ tiền; yêu cầu ở trạng thái chờ xử lý | D27; N24 |
| AC08 | Đối tác chấp nhận special | Khách thấy giá, nội dung, lịch và hạn cố định tính từ approved_at; chưa hiện “đã thanh toán” | D28; N24; O06 |
| AC09 | Special hết hạn chưa trả tiền | Link cũ không tạo payment mới; yêu cầu đóng theo quy tắc đã duyệt; không bắt đầu khắc | N24; O05, O06 |
| AC10 | Thanh toán hoàn tất trước hạn, webhook tới sau hạn | Đối soát đúng thời điểm provider; không từ chối chỉ vì thông báo chậm | N25 |
| AC11 | Webhook lặp hoặc khách refresh trang thành công | Không tạo đơn, commission hoặc phân bổ trùng | N33 |
| AC12 | Đối tác sửa giá sau khi đơn đã trả tiền | Đơn giữ giá/nội dung đã xác nhận; lịch sử sửa có thể truy vết | N15 |
| AC13 | Guide giới thiệu rồi đơn được hoàn một phần | Bảng đối soát phản ánh chính sách attribution và điều chỉnh được duyệt; không mặc định trả hoa hồng cả số tiền hoàn | D18; N21, N22, N29 |
| AC14 | Provider báo payout hoặc refund thất bại | Hiển thị chưa hoàn thành, có tác vụ xử lý; không ghi đã trả/đã hoàn chỉ vì đã yêu cầu | N26, N29, N38 |
| AC15 | Guide nhận một phần các đơn của đoàn | Chỉ đơn có bằng chứng bàn giao được hoàn tất; phần còn thiếu còn mở | N31; O10 |
| AC16 | Guide hoặc khách mở đơn không có quyền | Không lộ tên khắc, liên hệ, địa điểm hoặc số liệu tiền của người khác | N34 |
| AC17 | Bài tạp chí liên kết sản phẩm đã ngừng bán | Bài vẫn đọc được; CTA bán hàng hiển thị tình trạng phù hợp, không hứa hàng có sẵn | D06; N06 |
| AC18 | Người dùng dùng mobile và bàn phím | Hoàn thành xem quà, nhập tên, chọn lịch và thanh toán/yêu cầu; lỗi đọc được và không mất dữ liệu đã nhập | N36, N37 |

## 17 Giả định cần kiểm chứng

Mỗi phép kiểm chứng và chủ thể phụ trách trong bảng là ĐX MỚI N39. Không có số liệu nghiên cứu khách hàng hoặc kết quả pilot được cung cấp trong brainstorming.

| Mã | Giả định | Cách kiểm chứng đề xuất | Chủ thể và quyết định bị ảnh hưởng |
| --- | --- | --- | --- |
| A01 | Du khách sẵn sàng mua quà trước khi đến điểm nhận | Phỏng vấn và quan sát khách theo đoàn/tự túc; pilot có giao dịch thật | Hoàng; danh mục và hành trình |
| A02 | Ý nghĩa/câu chuyện làm khách chọn hoặc trả giá cao hơn | So sánh hành vi chọn quà và lý do mua; không chỉ hỏi khách có thích bài viết | Nội dung và nghiên cứu; D05 |
| A03 | Khách quốc tế hoàn tất checkout tiếng Anh trên mobile | Thử tác vụ với khách dùng tiếng Anh khi du lịch, gồm tên có dấu và mạng chậm | Thiết kế; D13 và N36 |
| A04 | Guide giới thiệu đủ khách và chính sách commission tạo động lực | Pilot với guide thực tế; đo lượt giới thiệu đến đơn bàn giao và thời gian hỗ trợ | Hợp tác; D09 và unit economics |
| A05 | Đối tác cập nhật tồn kho và dùng portal thường xuyên | Thử quy trình với nhân viên đối tác, cả giờ cao điểm và bán hàng offline | Vận hành đối tác; D19, D20 |
| A06 | Đối tác có thể tự viết nội dung tiếng Anh đáng tin và nhất quán | Chuẩn bị một nhóm sản phẩm mẫu, rà soát tính đúng và khả năng tự xuất bản | Đối tác; D22, D23 |
| A07 | Provider đáp ứng mô hình phân bổ với pháp nhân thực tế | Xác minh onboarding, charge/transfer/refund/payout trong môi trường thử | Tài chính và kỹ thuật; D17 |
| A08 | Danh mục phổ thông và cao cấp có đóng góp dương sau chi phí | Dùng báo giá thực, đo chi phí khắc, giao, provider, commission và hỗ trợ | Hoàng và đối tác; D15, D16 |
| A09 | Hạn thanh toán cố định giúp giữ năng lực mà khách vẫn quay lại trả tiền | Đo thời gian phản hồi, thanh toán sau chấp nhận và tỷ lệ hết hạn trong pilot | Vận hành; D28 |

## 18 Vấn đề còn mở và chủ thể quyết định

Các chủ thể dưới đây là vai trò cần tham gia, chưa phải sự phân công đã được họ chấp nhận. O01 đến O12 cần có quyết định trước nhận đơn thật nếu nghiệp vụ tương ứng được bật.

| Mã | Nội dung còn mở | Người cần quyết định hoặc xác minh | Tác động |
| --- | --- | --- | --- |
| O01 | Pháp nhân, hợp đồng người bán, trách nhiệm hóa đơn và nghĩa vụ thuế | Hoàng, đối tác, tư vấn kế toán/pháp lý | Chọn cấu hình tiền và điều khoản khách |
| O02 | Provider, tài khoản, charge model, onboarding và khả năng chuyển tiền | Tài chính, kỹ thuật, provider | D17 có triển khai được hay không |
| O03 | Phí nền tảng, cơ sở tính, phí provider, ai tài trợ commission, phí giao nhận | Hoàng và đối tác | Giá bán, dòng tiền và lợi nhuận |
| O04 | Phân loại standard/special, lead time, cutoff, năng lực, SLA phản hồi | Đối tác và vận hành | Cam kết lịch nhận và chuyển đổi |
| O05 | Giữ tồn/công suất tại checkout và sau chấp nhận special; thời gian giữ | Đối tác và kỹ thuật | Oversell, bỏ dở và cơ hội bán khác |
| O06 | Giá trị hạn cố định, 24 giờ có dùng khi ra mắt không; xử lý lịch nhận quá gần | Hoàng và đối tác | Luồng special, deadline và acceptance criteria |
| O07 | Hủy, refund, no-show, sai tên, hàng lỗi, chậm bàn giao, dispute và bên chịu phí | Hoàng, đối tác, tư vấn | Hỗ trợ khách và nghĩa vụ tài chính |
| O08 | Attribution, tỷ lệ, chu kỳ, ngưỡng, điều kiện đủ commission, hoàn sau chi trả | Hoàng, guide/công ty tour và đối tác | Đối soát công bằng và payout |
| O09 | Đồng tiền, phương thức thanh toán, payment chậm, lịch payout và số dư âm | Tài chính và provider | Deadline special, refund và cash flow |
| O10 | Phương thức/điểm nhận cụ thể, nhận hộ qua guide và bằng chứng bàn giao | Đối tác, guide và vận hành | AC15 và mốc hoàn thành |
| O11 | Đổi lịch, khách đến muộn/no-show, thời gian giữ hàng và hỗ trợ khẩn | Vận hành và đối tác | Trải nghiệm khách đang di chuyển |
| O12 | Chuẩn nội dung/ảnh, quyền ẩn sau xuất bản, quyền sử dụng và xử lý vi phạm | Hoàng và đối tác | Thương hiệu, D21 và editorial |
| O13 | Quyền dữ liệu, thời hạn lưu, yêu cầu xóa, chia sẻ dữ liệu với guide | Chủ sản phẩm và tư vấn phù hợp | N34 và quyền riêng tư |
| O14 | SKU/bài ra mắt, ngân sách, ngày ra mắt, quy mô tải, mục tiêu và SLA | Hoàng cùng đội triển khai | Roadmap, nguồn lực và go/no-go |

## 19 Rủi ro và dependencies

Mức độ và biện pháp trong bảng là **ĐX MỚI N40**. Đây là đánh giá trước triển khai, không phải kết quả audit.

| Rủi ro | Mức dự kiến | Biện pháp đề xuất và phụ thuộc |
| --- | --- | --- |
| Tồn kho offline lệch website; tự xác nhận nhưng không làm được | Cao | Quy trình quota/cập nhật tồn và khóa công suất; phụ thuộc O04, O05 và A05 |
| Tên khắc sai hoặc không hỗ trợ ký tự | Cao | Xác nhận nguyên văn, quy tắc ký tự của đối tác, kiểm tra trước khắc; O07 |
| Khách rời Luzern trước khi quà sẵn sàng | Cao | Lịch nhận có lead time/cutoff, cảnh báo đơn trễ, phương án hỗ trợ; O04, O10, O11 |
| Payment model không phù hợp pháp nhân hoặc trách nhiệm refund | Cao | Xác minh provider và tư vấn trước kiến trúc; O01, O02, O09 |
| Special được chấp nhận nhưng hết hạn không trả tiền | Trung bình | Hạn rõ ràng, giữ công suất theo thỏa thuận, đo tỷ lệ hết hạn; O05, O06, A09 |
| Hạn thanh toán tới sau giờ cần bắt đầu sản xuất | Cao | Chốt chính sách lịch quá gần, không tự rút ngắn hạn chưa duyệt; O06 |
| Hoa hồng và chi phí giao ăn hết lợi nhuận đơn nhỏ | Cao | Tính chi phí thực theo phương thức nhận và nguồn giới thiệu; O03, A08 |
| Nội dung tự xuất bản sai nguồn gốc hoặc làm giảm chất lượng thương hiệu | Trung bình | Trường dữ liệu nền, tiêu chuẩn và quyền xử lý sau xuất bản; O12, A06 |
| Chỉ một đối tác ngừng phục vụ | Cao | Phương án tạm dừng bán và xử lý đơn đã trả; thỏa thuận vắng mặt và sự cố |
| Gom đơn/giá B2B làm phình MVP | Trung bình | Giữ ưu tiên D11, đưa tự động hóa nhóm qua cổng duyệt riêng ở giai đoạn sau |
| Rò rỉ dữ liệu cá nhân hóa, nơi nhận hoặc thông tin khách | Cao | Phân quyền, giảm dữ liệu, kiểm tra truy cập trái quyền; O13, N34 |

Dependencies bắt buộc cho launch gồm danh mục và ảnh có quyền sử dụng; báo giá/lead time/năng lực của đối tác; điều khoản hợp tác và chính sách khách; tài khoản provider đủ điều kiện nhận tiền; cấu hình nhận/giao; kênh thông báo và hỗ trợ; dữ liệu guide/chính sách commission; quy trình đối soát kế toán; nhân sự trực vận hành. Những dependency này phải được kiểm tra bằng bằng chứng thực tế, không chỉ xác nhận bằng lời.

## 20 Metrics và tiêu chí pilot

**ĐX MỚI N41.** Đo theo cohort standard/special, theo nguồn guide/trực tiếp, thời điểm đặt trước/trong chuyến và phân khúc quà. Mục tiêu số chưa được chốt; không lấy giá hoặc tỷ lệ minh họa trong brainstorming làm benchmark.

| Chỉ số | Định nghĩa đề xuất | Cách dùng |
| --- | --- | --- |
| Đơn trả tiền và nhận đúng hẹn | Số đơn đã trả và bàn giao không muộn hơn lịch cam kết | Kết quả chính; xem cùng số refund và doanh thu |
| Paid conversion | Số đơn thanh toán thành công chia số phiên mua sắm đủ điều kiện, với quy tắc phiên được chốt | So sánh nguồn và phân khúc; special theo funnel riêng |
| Special approval rate | Yêu cầu được chấp nhận chia yêu cầu đã được đối tác quyết định | Đo khả năng đáp ứng và chất lượng yêu cầu |
| Special payment rate | Yêu cầu được trả tiền hợp lệ chia yêu cầu đã được chấp nhận | Đo khả năng quay lại trả tiền và deadline |
| Thời gian phản hồi special | Khoảng từ gửi yêu cầu tới quyết định của đối tác; theo p50 và p90 | Thỏa thuận SLA sau pilot |
| Tỷ lệ bàn giao đúng hẹn | Đơn hoàn tất đúng hẹn chia đơn đến hạn phải bàn giao | Không bỏ đơn lỗi/no-show khỏi mẫu mà không giải thích |
| Tỷ lệ sai khắc/hủy do đối tác | Số đơn lỗi tương ứng chia số đơn cần thực hiện | Đo rủi ro vận hành |
| Đóng góp của nền tảng mỗi đơn | Phí thực thu trừ chi phí provider/guide/hỗ trợ/giao/refund mà nền tảng thực chịu | Khác GMV; thuế và phân bổ chi phí cần O03 |
| Chênh lệch đối soát | Tổng sai lệch không giải thích được giữa đơn, provider, refund và khoản phải trả | Chặn chi trả khi chưa giải quyết |
| Guide hoạt động | Guide có đơn đã trả và bàn giao trong kỳ | Không dùng số guide đăng ký làm bằng chứng hiệu quả |
| Nội dung hỗ trợ mua | Phiên đọc bài hoặc thông tin ý nghĩa rồi xem sản phẩm/đặt hàng theo cửa sổ thống nhất | Chỉ là liên hệ hành vi, không chứng minh tác động nhân quả |

**ĐX MỚI N42.** Sự kiện tối thiểu: xem sản phẩm, xác nhận cá nhân hóa, chọn lịch, checkout bắt đầu, payment thành công, special gửi/chấp nhận/từ chối/hết hạn, đơn sẵn sàng/đã nhận, refund và commission paid. Không ghi nguyên văn tên khắc hoặc dữ liệu liên hệ vào analytics. Mục tiêu pilot và ngưỡng go/no-go được Hoàng cùng đối tác chốt tại O14 sau khi biết năng lực và chi phí thực.

## 21 Roadmap theo cổng quyết định

Toàn bộ roadmap là **ĐX MỚI N43**, chưa có ngân sách hoặc ngày cam kết. Đi theo cổng nghiệm thu giúp tránh thiết kế payment hoặc hứa giao nhận trước khi xác minh điều khoản.

| Giai đoạn | Đầu ra | Điều kiện chuyển bước |
| --- | --- | --- |
| 0 Rà soát và kiểm chứng | Duyệt PRD, chốt thương mại/fulfillment/payment, thử portal với đối tác, nghiên cứu nhu cầu | O01 đến O12 có chủ thể và quyết định; mô hình tiền và lịch nhận khả thi |
| 1 Thiết kế và đặc tả | UX storefront/portal/admin, trạng thái đơn, chính sách referral, backlog có AC | Chấp thuận các N cần triển khai, xử lý các xung đột deadline và đơn nhóm |
| 2 Xây MVP và thử nội bộ | Đặt standard/special, payment thử, cập nhật danh mục, đối soát và bàn giao giả lập | AC đã duyệt đạt; lỗi payment/refund/payout và phục hồi được kiểm tra |
| 3 Pilot tại Luzern | Danh mục nhỏ được thống nhất, khách thật, guide thật và đối tác trực vận hành | Đo nhu cầu, đúng hẹn, chi phí, tỷ lệ special trả tiền; không còn chênh lệch tiền chưa giải thích |
| 4 Mở rộng có điều kiện | Tự động hóa thêm payout guide, công cụ nhóm, chính sách B2B hoặc seller mới | Quy trình một đối tác ổn định; unit economics và nguồn lực đủ; duyệt phạm vi từng phần |

Nhu cầu tạo đơn nhóm và thanh toán tập trung ở D08/D10 được giữ trong backlog tương lai. Đa ngôn ngữ, nhiều seller/địa phương, QR kể chuyện và AI hỗ trợ nội dung cần đề xuất riêng, không tự trở thành điều kiện launch.

## 22 Câu hỏi thương lượng với đối tác Luzern

Danh sách sau là **ĐX MỚI N44**, dùng để chuẩn bị cuộc họp, chưa gửi cho đối tác và chưa tạo cam kết.

### Thương mại và vai trò người bán

1. Pháp nhân nào bán cho khách, xuất hóa đơn và chịu trách nhiệm khi hàng lỗi hoặc giao muộn? Cách thể hiện trên checkout và chứng từ là gì?
2. Phí nền tảng tính theo tỷ lệ hay số tiền cố định, trên giá trước hay sau thuế, có tính phần giao nhận hoặc khắc tên không?
3. Ai chịu phí payment provider, phí dispute, phí refund và khoản commission cho guide? Nếu có cả chính sách công ty tour và guide, phân bổ thế nào?
4. Đối tác có chấp nhận mô hình provider phân bổ tiền tự động không? Có thể hoàn thành onboarding và cung cấp tài khoản ngân hàng phù hợp không?

### Danh mục và năng lực thực hiện

5. SKU nào đủ điều kiện standard, SKU nào phải special? Giá, biến thể, tồn kho, ký tự khắc và thời gian chuẩn bị thực tế là gì?
6. Có thể xử lý bao nhiêu món khắc mỗi ngày, vào ngày nghỉ hoặc cao điểm? Cutoff từng loại sản phẩm và lịch nhận là gì?
7. Ai cập nhật tồn và portal, bao lâu một lần? Nếu cửa hàng bán offline, dùng quota riêng hay cập nhật thủ công ra sao?
8. Đối tác phản hồi special trong bao lâu? Khi chấp nhận có giữ hàng/công suất tới hạn trả tiền không? Nếu hết hạn, giải phóng thế nào?
9. Có dùng 24 giờ cố định không? Xử lý khách cần nhận sớm hơn tổng thời gian thanh toán cộng chuẩn bị ra sao mà không phá cam kết?

### Giao nhận và chăm sóc khách

10. Những phương thức nào có thể bật khi ra mắt: cửa hàng, guide nhận hộ, khách sạn hay điểm hẹn? Địa điểm, giờ, phí và người bàn giao là ai?
11. Bằng chứng nào xác nhận khách hoặc guide đã nhận đúng món? Khi guide nhận hộ, trách nhiệm chuyển sang guide ở mốc nào?
12. Nếu tên do khách nhập sai, đối tác khắc sai, hàng hỏng hoặc không kịp lịch, ai sửa/làm lại/refund và trong bao lâu?
13. Chính sách đổi lịch, hủy trước/sau khắc, no-show và giữ hàng là gì? Kênh liên hệ khẩn cho khách đang đi tour là gì?

### Nội dung và vận hành dài hạn

14. Đối tác có thể tự viết tiếng Anh, cung cấp nơi sản xuất thực và quyền sử dụng ảnh không? Tiêu chuẩn tối thiểu và quyền xử lý nội dung vi phạm là gì?
15. Ai là người dự phòng khi nhân viên phụ trách vắng mặt hoặc portal/provider lỗi? Có thể tạm ngừng bán và xử lý đơn đang mở thế nào?
16. Khi nào doanh thu được xem là có thể payout? Cần giữ phần dự phòng cho refund/dispute không? Quy trình khi tài khoản payout bị lỗi là gì?
17. Đối tác muốn nhận báo cáo theo kỳ nào? Ai duyệt đối soát và giải quyết chênh lệch trước khi trả guide?
18. Tiêu chí nào khiến hai bên tiếp tục, điều chỉnh hoặc dừng pilot? Nếu dừng hợp tác, ai xử lý đơn đã trả, nội dung, dữ liệu và khoản phải trả?

## 23 Danh mục đề xuất chưa được duyệt

Các mã N01 đến N44 được ghi ngay tại phần liên quan để rà soát theo ngữ cảnh. Đặc biệt cần duyệt N07/N08 về phạm vi, N12 về tách giỏ standard/special và guest checkout, N15 về quyền ẩn sản phẩm, N23 đến N29 về tiền và deadline, N33 đến N38 về phi chức năng, toàn bộ AC và N43 về roadmap.

ĐX NGUỒN còn cần duyệt gồm Stripe Connect là ứng viên; CHF là tiền tệ; cấu trúc biểu mẫu kể chuyện; liên kết bài/sản phẩm; thẻ/QR; số SKU và khoảng giá minh họa; attribution và chính sách một khoản chi trả chính; trạng thái commission; giữ phiên bản báo giá; đóng yêu cầu hết hạn; khóa link cũ; cách xử lý deadline khi nhận gấp; quyền ẩn nội dung sau xuất bản. Không áp dụng mặc định các ví dụ hoa hồng 10%, chia doanh thu 75/15/10, giá CHF 10–30 hoặc CHF 50–150, hoặc số lượng SKU từng được trợ lý nêu.

Việc người dùng yêu cầu lập PRD không tự phê duyệt các chi tiết mới này. Sau rà soát, mỗi đề xuất có thể được chấp nhận, sửa, hoãn hoặc bỏ; sổ D01 đến D28 vẫn giữ nguyên lịch sử quyết định nguồn.

## 24 Nguồn và quản lý phiên bản

S1. Brainstorming Workflow Availability. Cuộc trò chuyện người dùng chia sẻ, gồm concept ban đầu và 28 câu hỏi/lựa chọn. Đọc và đối chiếu ngày 10/10/2026. https://chatgpt.com/share/6aca07bd-9750-83ec-9cbe-3b8120c030ca

S2. Stripe, Understand how charges work in a Connect integration. Dùng để xác minh rằng loại charge ảnh hưởng dòng tiền, refund và dispute; không xác nhận mô hình cụ thể đã phù hợp với dự án. Đối chiếu ngày 10/10/2026. https://docs.stripe.com/connect/charges

S3. Stripe, Manage payout schedules for connected accounts. Dùng để phân biệt payout tài khoản liên kết với phân bổ tiền giao dịch; lịch thực tế cần xác minh theo cấu hình và điều kiện tài khoản. Đối chiếu ngày 10/10/2026. https://docs.stripe.com/connect/payouts-connected-accounts

v1 ngày 10/10/2026 tổng hợp D01 đến D28 và bổ sung đặc tả có nhãn. Bản cập nhật tiếp theo cần ghi thay đổi quyết định, người duyệt và ngày có hiệu lực; không biến giả định hoặc đề xuất thành CHỐT chỉ bằng cách xóa nhãn.
