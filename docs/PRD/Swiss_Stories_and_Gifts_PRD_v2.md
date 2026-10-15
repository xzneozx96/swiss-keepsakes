# Swiss Stories & Gifts / Lucerne Keepsake

Tài liệu yêu cầu sản phẩm, phiên bản 2 · Ngày 12/10/2026 · Ngôn ngữ tài liệu: tiếng Việt

Tài liệu dành cho chủ sản phẩm, Chị Ngọc, đội thiết kế, phát triển và vận hành. Đây là cơ sở thống nhất phạm vi và lập kế hoạch triển khai; chưa phải cam kết ngày ra mắt. Tên thương hiệu chính thức còn cần xác nhận giữa Swiss Stories & Gifts và Lucerne Keepsake.

## 1. Vấn đề và kết quả cần đạt

Chị Ngọc đang quản lý đối tác giới thiệu và đơn hàng ngoài hệ thống, nên khó theo dõi nguồn bán, tình trạng thực hiện, tiền còn phải thu và hoa hồng cần trả. Khi có nhiều loại sản phẩm và nhiều người cùng vận hành, những thông tin này cần được đối chiếu trong cùng một cửa hàng.

Du khách cần chọn quà hoặc dịch vụ phù hợp với thời gian ở địa phương. Trước khi đặt, họ cần biết sản phẩm có gì đáng nhớ, có thể cá nhân hóa hay không, ngày nhận hoặc lịch dịch vụ, tổng giá và số tiền phải trả ở từng mốc. Đối tác giới thiệu cần thấy kết quả bán hàng và hoa hồng của mình mà không phải xin bảng đối soát thủ công hoặc tiếp cận thông tin liên hệ và yêu cầu tùy chỉnh của khách.

Sản phẩm kết nối câu chuyện địa phương, quà lưu niệm và dịch vụ du lịch với luồng đặt hàng, thanh toán và vận hành. Chị Ngọc là merchant duy nhất mở bán trong Phase 1. Sau đó, nền tảng có thể mời thêm merchant độc lập, mỗi bên có cửa hàng, nhân sự, dữ liệu và tài khoản nhận tiền riêng.

### 1.1 Mục tiêu sản phẩm

- Khách tự chọn, đăng nhập, đặt hàng hoặc đặt tour, trả khoản đến hạn và theo dõi giao dịch.
- Merchant quản lý danh mục, khả dụng, đơn hàng, booking, dư nợ và đối tác giới thiệu trong cửa hàng của mình.
- Mỗi giao dịch xác định được người bán, nguồn giới thiệu, tình trạng thực hiện, khoản đã thu và hoa hồng.
- Nội dung và tư vấn giúp khách tìm được quà hoặc dịch vụ phù hợp với chuyến đi.
- Dữ liệu được ghi từ đầu để đánh giá kênh bán, bốn nhóm khách, hiệu quả sản phẩm và lãi đóng góp.

Kết quả kinh doanh cần đo là số đơn và booking hoàn tất, hiệu quả từng kênh và lãi đóng góp. Chưa có mục tiêu số được duyệt. Lượt xem, lượt mở QR và số đối tác tham gia là chỉ số hỗ trợ, không thay thế giao dịch đã thực hiện và thu đủ tiền.

### 1.2 Nguyên tắc trải nghiệm

Giao diện cần dùng tốt trên điện thoại và dễ hiểu với merchant, đối tác ít quen công nghệ. Khách phải phân biệt được đã xác nhận đặt hàng, đã thanh toán và đã hoàn tất. Hệ thống không hứa giao đúng ngày, tạo lịch trình bằng AI hoặc cung cấp dịch vụ chưa có năng lực thực hiện được xác minh.

## 2. Cách đọc tài liệu và cơ sở quyết định

Các yêu cầu trong những phần phạm vi và nghiệp vụ dưới đây dựa trên quyết định đã chốt trong cuộc họp và được người dùng xác nhận trong hội thoại. Những chi tiết chưa được duyệt được đặt trong đoạn hoặc bảng có tên **Đề xuất** hay **Còn mở**. Nội dung từ kế hoạch kinh doanh được ghi là **Kỳ vọng khách hàng**; giá, tỷ lệ và chỉ tiêu pilot trong nguồn này là giả định thử nghiệm.

| Cơ sở | Cách sử dụng |
| --- | --- |
| Quyết định mới nhất trong cuộc họp và hội thoại | Ưu tiên khi khác bản v1 hoặc tài liệu tham khảo |
| Kế hoạch kinh doanh Lucerne Keepsake | Giữ danh mục, phễu, mạng lưới pilot, lộ trình 180 ngày, dashboard, KPI tài chính và ba ưu tiên trước mắt |
| Bốn hồ sơ khách du lịch | Định hướng nhu cầu và cách tiếp cận, chưa phải kết quả nghiên cứu người dùng |
| Tư liệu hành trình và kể chuyện | Nguồn cảm hứng nội dung, không chứng minh một tour hay trải nghiệm đang sẵn sàng bán |
| PRD v1 | Đối chiếu lịch sử; không tự khôi phục yêu cầu đã được thay thế |

Việc đưa một đề xuất hoặc tiêu chí nghiệm thu vào PRD không tự phê duyệt chi tiết đó. Nhận định về văn hóa kinh doanh Thụy Sĩ trong cuộc họp là bối cảnh khách hàng cung cấp, chưa phải nghiên cứu thị trường độc lập.

Trong tài liệu, **merchant** là bên sở hữu và vận hành cửa hàng; **đối tác giới thiệu** là guide, khách sạn hoặc bên đưa khách đến cửa hàng. Một nhà cung cấp tour hoặc điểm nhận hàng không tự trở thành merchant hay có quyền truy cập cửa hàng. **Đơn hàng** dùng cho hàng hóa; **booking** dùng cho một lần đặt dịch vụ. **Hoàn tất** luôn có nghĩa đã cung cấp hàng hoặc dịch vụ và đã thu đủ tiền.

## 3. Khách hàng mục tiêu và hồ sơ chuyến đi

Sản phẩm phục vụ cả bốn nhóm ngay từ đầu. Kênh bán ưu tiên ban đầu là khách theo đoàn qua hướng dẫn viên. Mô tả dưới đây là định hướng của khách hàng để thử nghiệm thông điệp và sản phẩm.

| Nhóm khách | Tình huống cần phục vụ | Cách tiếp cận và lời chào hàng định hướng |
| --- | --- | --- |
| Khách đoàn trong ngày | Lịch gấp, tập trung điểm biểu tượng, cần chọn và nhận nhanh | Guide gửi QR trên xe hoặc trước chuyến đi; quà theo địa danh, đặt trước, hạn nhận rõ. Kế hoạch kinh doanh gợi ý quà CHF 15–69 và audio tour ngắn |
| Khách đoàn nhiều ngày | Lịch trình cố định, có thời gian chọn quà và một số khoảng tự do | Công ty lữ hành, guide, nội dung theo hành trình trên trang khám phá chung; bộ sưu tập theo cung đường, hộp quà cá nhân hóa, tour ngày tự do |
| Khách tự túc nhiều ngày | Khám phá sâu, đi solo hoặc cùng gia đình, tìm trải nghiệm bản địa | Khách sạn, blog, tìm kiếm, mạng xã hội; Hidden Lucerne 2–3 giờ, tour Alps, làng nghề, quà giới hạn và tư vấn chuyến đi |
| Khách tự túc trong ngày | Lịch linh hoạt nhưng ít thời gian, có thể mua ngẫu hứng | Bản đồ miễn phí, QR tại đối tác, nội dung ngắn; walking map 60–90 phút, quà nhỏ, thông tin ngày nhận hiển thị sớm |

### 3.1 Dữ liệu để báo cáo đủ bốn nhóm

Hồ sơ chuyến đi có lựa chọn **đi theo đoàn hoặc tự túc**, **ngày đến** và **ngày rời đi**, gắn với từng đơn hàng hoặc booking, không phải một hồ sơ duy nhất cho mỗi khách. Dữ liệu này phục vụ phân nhóm khách và analytics. Không suy luận khách đi theo đoàn chỉ vì họ mở link của guide.

**Đề xuất:** các ngày phản ánh thời gian tại địa điểm liên quan đến nhận hàng hoặc sử dụng dịch vụ, với nhãn địa điểm rõ ràng. Không mặc định đó là thời gian của toàn bộ kỳ nghỉ. Báo cáo dùng nhóm "chưa xác định" khi thiếu dữ liệu, thay vì tự gán khách vào một trong bốn nhóm.

**R09 / O13 đã chốt ngày 13/10/2026:** thông tin đi theo đoàn hoặc tự túc, ngày đến và ngày rời đi là tùy chọn. Hỏi trên trang thành công sau khi gửi yêu cầu mua hàng (không cần chờ merchant xác nhận hoặc thanh toán), hoặc sau khi booking được xác nhận. Ngày 14/10/2026 chốt: câu trả lời lưu trên từng đơn hàng hoặc booking; một lần gửi yêu cầu tạo nhiều đơn thì mọi đơn của lần gửi đó nhận cùng câu trả lời. Khách có thể bỏ qua và bổ sung, chỉnh sửa trên chính đơn hàng hoặc booking đó trong tài khoản; báo cáo phân loại từng giao dịch theo câu trả lời của chính giao dịch đó và giữ nhóm "chưa xác định" nếu chưa đủ dữ liệu phân nhóm. Hồ sơ này không thay thế ngày nhận hàng hoặc ngày tham gia tour cần cho giao dịch.

**Còn mở:** địa điểm mà ngày đến và ngày rời đi áp dụng; quy tắc trong ngày, qua đêm và nhiều ngày. Cách diễn giải ngày và phân loại cần thống nhất trước pilot đo lường.

## 4. Phạm vi phát hành

### 4.1 Phase 1 và giai đoạn mở rộng

| Năng lực | Phase 1 | Giai đoạn mở rộng |
| --- | --- | --- |
| Cửa hàng và nhân sự | Một merchant mở bán là Chị Ngọc; Owner và Store Manager; một trang khám phá chung phục vụ cả bốn nhóm khách và trang cửa hàng | Super Admin mời merchant độc lập; dữ liệu, nhân sự và tài khoản nhận tiền riêng; landing page theo chiến dịch khi cần |
| Danh mục giao dịch | Hàng hóa và tour có lịch cố định; tour riêng nhận yêu cầu báo giá theo nhóm. Lưu trú và Trải nghiệm hiển thị là danh mục "Soon" (trống, chưa có sản phẩm, không bán) trên trang khám phá và trong tab Sản phẩm của merchant (mục 7.0) | Lưu trú theo loại phòng hoặc nguyên căn; trải nghiệm có lịch cố định |
| Khách và giao dịch | Google hoặc mã xác nhận email; giỏ hàng hóa, checkout tour riêng, xem giao dịch và trả dư nợ | Giỏ hàng hóa nhiều merchant; checkout chung khi điều kiện tương thích, tạo đơn riêng từng merchant |
| Vận hành và tiền | Chính sách trả toàn bộ, đặt cọc hoặc không trả trước; cập nhật thực hiện; thu số dư online hoặc ghi nhận thu bên ngoài; hủy và hoàn tiền | Cùng quy tắc nền cho loại dịch vụ và merchant mới |
| Giới thiệu và hoa hồng | QR, link, last-click, tỷ lệ từng sản phẩm, báo cáo riêng cho đối tác, ghi nhận chi trả ngoài hệ thống | Mở rộng mạng lưới và giải quyết attribution giữa nhiều merchant |
| Nội dung và tương tác | Merchant quản lý blog, bình luận; đánh giá sau hoàn tất; chia sẻ bằng QR hoặc link; ra mắt bằng tiếng Anh và tiếng Đức | Có thể bổ sung ngôn ngữ khác theo lộ trình được duyệt |
| Tư vấn chuyến đi | Trợ lý AI dạng trò chuyện hỏi tuần tự bộ câu hỏi cố định (R19), lưu yêu cầu, gửi email merchant | AI lập kế hoạch hoặc thu phí plan nếu được duyệt riêng |
| Đo lường | Phễu, nguồn, nhóm khách, sản phẩm, tiền, hoa hồng và dữ liệu lịch sử từ đầu | CRM, phân tích AI và thử nghiệm nâng cao |

**Đã chốt cập nhật ngày 12/10/2026:** Phase 1 dùng một trang khám phá chung có nội dung phù hợp cả bốn nhóm khách, thay cho bốn landing page riêng trong kế hoạch kinh doanh. Trang chung giúp khách tìm quà, tour, bài viết và tư vấn mà không bắt buộc chọn nhóm khách trước khi khám phá. Trang cửa hàng, trang sản phẩm và bài viết vẫn có vai trò riêng. Landing page riêng là khả năng mở rộng khi có chiến dịch với nội dung và thông điệp đủ khác biệt; không phải yêu cầu Phase 1.

**Ngôn ngữ ra mắt đã chốt:** tiếng Anh và tiếng Đức. Giao diện Phase 1, thông tin giao dịch do hệ thống tạo và thông báo gửi khách hỗ trợ cả hai ngôn ngữ. Merchant quản lý bản nội dung theo ngôn ngữ; thiết kế cho phép thêm ngôn ngữ sau này.

**R02 / O01 đã chốt ngày 13/10/2026:** merchant được xuất bản sản phẩm/tour khi có nội dung thiết yếu đầy đủ bằng ít nhất một ngôn ngữ ra mắt; không buộc có cả bản tiếng Anh và tiếng Đức. Khi ngôn ngữ khách chọn chưa có bản nội dung đầy đủ, hiển thị bản hiện có kèm thông báo rõ ngôn ngữ của bản đó; không tự dịch hoặc trộn các đoạn từ hai bản ngôn ngữ để che thiếu bản dịch. Giao diện và thông báo hệ thống vẫn theo ngôn ngữ khách chọn. Quy tắc này áp dụng cả chính sách và hướng dẫn do merchant viết, kể cả khi hiển thị trong checkout hoặc giao dịch. Bài blog có thể xuất bản riêng từng ngôn ngữ và dùng thông báo tương tự khi khách mở ngôn ngữ chưa có. Ngôn ngữ mặc định và bản dịch bộ câu hỏi widget còn cần chốt.

Bản đồ, audio và chăm sóc sau chuyến đi vẫn thuộc kỳ vọng kinh doanh. Hình thức bản đồ, audio và đợt phát hành cụ thể cần chốt; không mặc định phải có dẫn đường hoặc bản đồ tương tác trong Phase 1.

Ngay từ đầu, quyền sở hữu cửa hàng, nhân sự và đơn hàng phải hỗ trợ nhiều merchant độc lập. Điều này không đồng nghĩa với việc bật bán nhiều merchant, lưu trú hoặc trải nghiệm ngay Phase 1.

### 4.2 Những việc không thuộc phạm vi hiện tại

- Không có hệ thống giao hàng, tracking vận chuyển hoặc tối ưu tuyến. Việc giao nhận được sắp xếp ngoài nền tảng.
- Không có merchant tự đăng ký mở bán công khai; chỉ tham gia qua lời mời Super Admin.
- Không có AI tự tạo lịch trình hay thu phí tư vấn trong Phase 1.
- Không có Super Admin viết, duyệt hoặc quản lý blog của merchant.
- Không tự động chuyển hoa hồng cho đối tác giới thiệu.
- Chưa bao gồm kế toán tổng hợp, đồng bộ ERP, POS, OTA hay channel manager.
- Chưa áp dụng phí nền tảng hoặc subscription; mô hình thu phí còn mở.
- Không kế thừa luồng standard/special, guest checkout, chia tiền tự động hoặc hạn trả tiền 24 giờ từ v1.

Khách tự đặt và thanh toán là hành trình hiện tại. Không tự bổ sung giỏ dịch vụ hỗn hợp, checkout tập trung qua guide hoặc quyền xử lý đơn cho đối tác giới thiệu.

## 5. Vai trò và quyền truy cập

| Vai trò | Quyền và trách nhiệm đã xác định | Ranh giới |
| --- | --- | --- |
| Super Admin | Mời merchant tham gia mạng lưới | Không viết hoặc quản lý blog. Quyền hỗ trợ vận hành và tạm ngừng cửa hàng cần đặc tả riêng |
| Owner | Sở hữu cửa hàng, cấu hình cửa hàng, mời Store Manager; được điều chỉnh hoặc hủy khoản thu bên ngoài đã ghi sai với lý do và lịch sử thao tác | Mỗi cửa hàng có dữ liệu, nhân sự và tài khoản nhận tiền riêng |
| Store Manager | Nhận lời mời và làm việc trong cửa hàng được cấp quyền; ghi nhận thu tiền bên ngoài, thực hiện hoàn tiền, ghi nhận hoa hồng đã chi và đánh dấu hoàn tất khi đã cung cấp hàng/dịch vụ, thu đủ tiền | Không có quyền ở cửa hàng khác hoặc điều chỉnh/hủy khoản thu đã ghi |
| Đối tác giới thiệu | Có QR hoặc link giới thiệu và báo cáo riêng không cần đăng nhập truyền thống | Không được xử lý đơn hoặc thu tiền; chỉ xem tên khách trên giao dịch thuộc nguồn của mình, không xem thông tin liên hệ hay yêu cầu tùy chỉnh |
| Khách | Xem nội dung, đăng nhập để đặt hàng, booking và bình luận; xem giao dịch của mình | Chỉ đánh giá hàng hoặc dịch vụ đã mua sau khi giao dịch hoàn tất |

Owner mời Store Manager qua email. Người nhận đăng nhập hoặc tạo tài khoản rồi chấp nhận lời mời; luồng này có trong Phase 1. Merchant mới không thể tự mở bán nếu chưa được Super Admin mời và chưa hoàn tất điều kiện tài khoản nhận tiền.

Khách đọc blog và xem sản phẩm không cần tài khoản. Khi mua, đặt dịch vụ, thanh toán hoặc bình luận, khách đăng nhập bằng Google hoặc mã xác nhận gửi qua email.

**Đề xuất phân quyền:** Owner giữ quyền quản lý thành viên và tài khoản nhận tiền. Manager được cấp các nhóm quyền vận hành sản phẩm, lịch, tồn, giao dịch, nội dung, widget và báo cáo. Một danh tính có thể thuộc nhiều cửa hàng, nhưng quyền gắn với từng quan hệ thành viên và không lan sang cửa hàng khác.

**Còn mở:** phương thức đăng nhập của nhân sự; lời mời hết hạn hoặc bị thu hồi; các quyền chi tiết chưa được xác định; quyền hỗ trợ của Super Admin.

## 6. Hành trình chính

### 6.1 Từ nguồn giới thiệu đến giao dịch

Kỳ vọng khách hàng là một phễu xuyên suốt: guide, khách sạn, QR hoặc website dẫn đến câu chuyện và bản đồ có ảnh, audio, lịch sử; khách đặt quà hoặc tour; merchant cung cấp hàng hoặc dịch vụ; sau đó tiếp tục chăm sóc khách sau chuyến đi.

Mỗi đối tác có QR hoặc link riêng. Khách có thể vào trực tiếp, từ trang khám phá chung, cửa hàng hoặc bài viết và vẫn mua được. Không bắt buộc có guide. Trang khám phá chung có nội dung phù hợp cả bốn nhóm; khách không phải chọn nhóm trước khi xem. QR hoặc link bài viết phải dẫn đúng nội dung được chia sẻ. QR/link đối tác vẫn ghi nhận nguồn giới thiệu dù các đối tác dẫn tới cùng một trang; hồ sơ chuyến đi hỗ trợ báo cáo nhóm khách mà không cần bốn landing page riêng.

**Đề xuất:** trang khám phá chung liên kết sản phẩm hoặc tour khả dụng, bài viết và widget tư vấn. Sau chuyến đi, gửi lời mời đánh giá và nội dung liên quan theo quy tắc liên hệ được duyệt. Marketing cần sự đồng ý của khách. Cần phân biệt thông báo giao dịch với nội dung marketing khi chốt luồng email.

### 6.2 Khách mua quà

*Ghi chú nhãn (15/10/2026): trên giao diện, nhóm hàng hóa này mang nhãn **Keepsakes** (EN) và **Andenken** (DE); nhãn cũ "Gifts/Geschenke" không còn dùng. Xem mục 7.0.*

1. Khách xem thông tin sản phẩm, chọn thuộc tính, số lượng và nội dung cá nhân hóa nếu có.
2. Khách nhập ngày mong muốn nhận hàng và chọn một điểm hoặc cách nhận trong danh sách merchant cấu hình. Hệ thống đối chiếu tồn và thời gian chuẩn bị của sản phẩm.
3. Khách đăng nhập, xem lại lựa chọn, tổng tiền và chính sách, rồi gửi yêu cầu đặt hàng **chưa thanh toán**. Đơn ở trạng thái **Chờ người bán xác nhận**.
4. Merchant kiểm tra khả năng đáp ứng, ngày nhận và phương án nhận khách chọn. Nếu không đáp ứng được, merchant trao đổi với khách qua email để thống nhất phương án khác trước khi xác nhận; ngày và phương án nhận đã thỏa thuận phải được cập nhật trong đơn và hiển thị cho khách.
5. Sau khi merchant xác nhận, hệ thống mới yêu cầu khách thanh toán khoản đến hạn theo chính sách sản phẩm. Nếu chính sách không thu trước, đơn không cần bước thanh toán này. Trạng thái **Đang chuẩn bị** chỉ bắt đầu sau khi điều kiện xác nhận và khoản thanh toán đến hạn được đáp ứng.
6. Merchant chuẩn bị và cập nhật tiến độ thủ công. Giao nhận được phối hợp bên ngoài hệ thống. Khách trả số dư trực tuyến, hoặc nhân sự ghi nhận khoản thu bên ngoài. Merchant chỉ hoàn tất đơn khi đã cung cấp hàng và thu đủ tiền.
7. Hệ thống ghi nhận hoa hồng của đối tác hợp lệ và cho khách đánh giá.

Ngày nhận do khách nhập, không phụ thuộc lịch tour hoặc link guide. Ngày và phương án nhận khách chọn là yêu cầu; chúng chỉ được xác nhận sau khi merchant chấp nhận và được lưu vào đơn. Merchant có thể cấu hình nhiều điểm/cách nhận cho khách chọn, còn việc bàn giao thực tế diễn ra bên ngoài hệ thống. Cần phân biệt **Chờ người bán xác nhận**, **Người bán đã chấp nhận, chờ thanh toán khoản đến hạn** (nếu có), **Đơn đã xác nhận, đang chuẩn bị**, **Sẵn sàng bàn giao** và **Hoàn tất**. Cách xử lý yêu cầu bị từ chối hoặc khách không chấp nhận phương án mới còn cần chốt.

**R03 / O04 đã chốt ngày 13/10/2026:** khi chờ merchant xử lý yêu cầu hàng hóa, khách thấy "Đang chờ người bán xác nhận"; không hiển thị thời gian phản hồi dự kiến trên trang sản phẩm, bước gửi yêu cầu, trang đơn hoặc email xác nhận đã nhận yêu cầu. Ngày nhận vẫn là ngày khách yêu cầu, chưa được merchant cam kết. Quyết định này không đặt hạn phản hồi nội bộ hoặc lịch nhắc merchant; các quy tắc đó chưa được chốt.

**O05 — Giữ tồn hàng hóa đã chốt ngày 13/10/2026:** thêm vào giỏ hoặc gửi yêu cầu chưa giữ tồn. Khi Owner/Store Manager chấp nhận đơn, hệ thống kiểm tra lại số lượng khả dụng của từng biến thể/SKU và giữ đủ hàng cho toàn bộ đơn; nếu thiếu thì không chấp nhận hoặc yêu cầu thanh toán cho đơn đó. Việc kiểm tra và giữ hàng phải bảo đảm hai thao tác đồng thời không cùng chấp nhận phần tồn cuối. Quy tắc áp dụng cho cả trả đủ, đặt cọc và không trả trước. Đơn đã chấp nhận giữ hàng trong lúc chờ khoản đầu và trong quá trình chuẩn bị; khi bị hủy (kể cả tự hủy do quá hạn khoản đầu), giải phóng phần hàng chưa bàn giao đang giữ. Bàn giao chuyển phần giữ thành hàng đã xuất, không trả lại tồn chỉ vì giao dịch được hoàn tiền; việc nhận hàng trả lại và khả năng bán lại cần ghi nhận riêng. Các yêu cầu khác vẫn phải kiểm tra tồn tại lúc được chấp nhận.

### 6.3 Khách đặt tour

1. Khách xem tour, lịch trình, dịch vụ đi kèm, điều kiện tham gia và chính sách.
2. Khách chọn lịch khởi hành cố định, số người theo nhóm tuổi và cung cấp thông tin tham gia cần thiết.
3. Khách đăng nhập và trả khoản đến hạn theo chính sách, nếu có.
4. Booking tự xác nhận khi đủ chỗ và đáp ứng chính sách thanh toán. Với tour không trả trước, khách không cần cung cấp thẻ hay trả tiền lúc đặt; booking giữ chỗ, hiển thị rõ số dư và hạn thanh toán theo chính sách tour.
5. Khách tham gia tour. Merchant cập nhật thực hiện, đối chiếu số dư và hoàn tất khi đã thu đủ.
6. Hoa hồng và đánh giá mở theo cùng điều kiện với hàng hóa.

Tour riêng đi qua luồng nhận yêu cầu báo giá theo nhóm. Yêu cầu đó không tự trở thành booking có giá cố định; cách chuyển báo giá thành giao dịch còn cần đặc tả.

**R06 / O05 đã chốt ngày 13/10/2026:** khi tạo booking tour cần trả ngay hoặc đặt cọc, hệ thống giữ số chỗ đã chọn trong 15 phút. Nếu chưa hoàn tất thanh toán trong hạn, booking hết hiệu lực, chỗ được giải phóng và khách phải đặt lại nếu còn chỗ. Tải lại trang không gia hạn. Booking không trả trước đã xác nhận và thanh toán số dư không dùng đồng hồ giữ chỗ ban đầu này. Việc đóng phiên thanh toán khi hết hạn và đối soát kết quả provider đến muộn phải được kiểm chứng kỹ thuật; không tự khôi phục booking đã hết hiệu lực hoặc bán vượt chỗ.

**Đã chốt cho tour không trả trước:** hệ thống nhắc khách về hạn thanh toán và xử lý booking/chỗ chưa trả tiền theo chính sách đã công bố của tour. Chính sách có thể quy định hủy khi quá hạn và trả lại chỗ cho lịch khởi hành; không mặc định yêu cầu lưu thẻ hoặc tự động trừ tiền. Merchant thấy các booking còn nợ để xử lý. Thời điểm gửi nhắc, thời gian gia hạn và quy tắc hủy cụ thể còn cần chốt.

### 6.4 Merchant vận hành cửa hàng

Merchant chuẩn bị nội dung, sản phẩm, lịch hoặc tồn, chính sách thanh toán, tài khoản nhận tiền và đối tác giới thiệu trước mở bán. Khi có đơn hoặc booking, Owner hay Manager theo dõi việc sắp đến hạn, cập nhật thực hiện, ghi khoản thu hoặc xử lý hủy và hoàn tiền theo quyền. Dashboard phải giúp họ phân biệt việc còn phải làm, tiền còn phải thu và hoa hồng còn phải trả.

### 6.5 Đối tác xem kết quả giới thiệu

Đối tác chia sẻ QR hoặc link công khai. Họ mở một link báo cáo riêng và xác nhận mã gửi tới email đã đăng ký khi bắt đầu phiên truy cập mới để xem giao dịch được ghi nguồn, giá trị và hoa hồng theo ngày, tuần hoặc tháng; không cần mật khẩu. Merchant trả hoa hồng ngoài hệ thống rồi ghi nhận đã chi. Báo cáo cập nhật phần đã ghi nhận, đã trả và còn phải trả, chỉ hiển thị tên khách, không hiển thị thông tin liên hệ hoặc yêu cầu tùy chỉnh của khách.

### 6.6 Khách gửi yêu cầu tư vấn

Khách mở widget, trả lời lần lượt bộ câu hỏi của cửa hàng rồi gửi yêu cầu. Hệ thống lưu yêu cầu và gửi email cho merchant. Chị Ngọc lên kế hoạch và phản hồi qua email ngoài hệ thống. Widget là cuộc trò chuyện với trợ lý AI của cửa hàng (R19, chốt 14/10/2026); ở Phase 1 trợ lý chỉ hỏi bộ câu hỏi cố định, không tạo plan tức thì và không trả lời câu hỏi tự do.

## 7. Danh mục và hành vi theo loại sản phẩm

Merchant đăng nhiều sản phẩm, mỗi sản phẩm có cấu hình riêng. Cần phân biệt loại nghiệp vụ như hàng hóa, tour, lưu trú, trải nghiệm với danh mục như dao hoặc moto tour, và thuộc tính như kích thước hoặc thiết kế. Thuộc tính không bị giới hạn ở kích thước.

### 7.0 Danh mục và danh mục con

**Đã chốt ngày 15/10/2026 (chủ sản phẩm).** Từ mục này trở đi dùng hai thuật ngữ thống nhất: **Category (danh mục)** và **Sub-category (danh mục con)**; không dùng song song "loại" và "danh mục" như đoạn mở đầu mục 7 ở trên.

**Bốn danh mục cố định.** Chỉ có bốn danh mục, do hệ thống định nghĩa, merchant không thêm, sửa hay xóa được:

| Danh mục | Trạng thái Phase 1 | Danh mục con |
| --- | --- | --- |
| Keepsakes (Andenken) | Đang bán (hàng hóa, mục 7.2) | Có, merchant quản lý |
| Tours | Đang bán (mục 7.3) | Chưa có |
| Stays | "Soon": hiển thị, trống, không có sản phẩm, không có trình soạn thảo (mục 7.4) | Chưa có |
| Experiences | "Soon": hiển thị, trống, không có sản phẩm, không có trình soạn thảo (mục 7.5) | Chưa có |

**Danh mục con theo từng cửa hàng.** Mỗi cửa hàng có danh sách danh mục con riêng, **merchant tự chỉnh**: thêm, đổi tên bằng EN/DE (ít nhất một ngôn ngữ), sắp xếp thứ tự và xóa. Mỗi danh mục con thuộc đúng một danh mục. Hiện chỉ Keepsakes có danh mục con; Tours, Stays và Experiences chưa có. Cửa hàng thử nghiệm của Chị Ngọc dùng năm danh mục con dưới Keepsakes (mục 7.1).

**Quy tắc sản phẩm và danh mục con**
- Một keepsake (sản phẩm) thuộc đúng một danh mục con; danh mục của sản phẩm suy ra từ danh mục con đó.
- Trình soạn thảo yêu cầu chọn danh mục con mới cho xuất bản; bản nháp được lưu khi chưa chọn.
- Danh mục con còn sản phẩm được đổi tên nhưng **không được xóa**. Màn hình quản lý hiện số sản phẩm và chặn nút xóa, nên không có sản phẩm nào bị mất danh mục. Muốn xóa, merchant chuyển hết sản phẩm sang danh mục con khác trước.
- Không trùng tên giữa các danh mục con của cùng cửa hàng; tên không được để trống ở cả hai ngôn ngữ.

**Hành vi với khách**
- Trang khám phá hiện bốn danh mục; Stays và Experiences gắn nhãn "Soon".
- Danh sách Keepsakes lọc theo danh mục con của cửa hàng. Khách chỉ thấy danh mục con có ít nhất một keepsake đã xuất bản.
- "Browse" trong tìm kiếm hiện các danh mục con đó cùng Tours.

**Hành vi với merchant.** Tab Sản phẩm gồm Keepsakes, Tours, Stays (Soon), Experiences (Soon) và Pickup points. Tab Keepsakes có bộ lọc Status (Active/Archived) và Sub-category, cùng liên kết "Manage categories" tới màn hình quản lý danh mục (M26 trong đặc tả UX).

**Nhãn.** Nhãn giao diện "Gifts/Geschenke" được thay bằng **Keepsakes** (EN) và **Andenken** (DE) trên toàn ứng dụng, cho cả khách và merchant. Chỉ đổi nhãn hiển thị; tên mã và đường dẫn (ví dụ `/gifts`, `GiftEditor`) giữ nguyên. Văn xuôi tiếng Việt trong tài liệu này vẫn dùng "quà" để chỉ khái niệm.

**Dữ liệu.** Category là tập cố định {keepsakes, stays, experiences, tours}; Subcategory gồm id, categoryId, tên EN/DE, ảnh và tagline (tùy chọn), lưu theo cửa hàng; sản phẩm giữ `subcategoryId`. Dữ liệu demo lưu trước thay đổi này được nâng cấp tại chỗ: id danh mục cũ trở thành danh mục con của Keepsakes.

**Chưa làm / giới hạn:** danh mục con do merchant tạo chưa có trình soạn ảnh và tagline (ô của khách dùng ảnh keepsake trung tính); danh mục con của Tours, Stays, Experiences chưa được quản lý.

### 7.1 Danh mục thử nghiệm của khách hàng

*Cập nhật 15/10/2026: năm nhóm dưới đây là **danh mục con của cửa hàng thử nghiệm (Chị Ngọc) thuộc Keepsakes**: Pocket knives (Taschenmesser), Gift boxes (Geschenkboxen), Chocolate (Schokolade), Prints (Drucke), Small gifts (Kleine Geschenke). Bảng ngay dưới là kỳ vọng danh mục và giá trong kế hoạch kinh doanh, không phải danh sách danh mục con đã cấu hình.*

| Danh mục | Nội dung | Giá minh họa trong kế hoạch kinh doanh |
| --- | --- | --- |
| Postcard, móc khóa | Quà giá thấp | CHF 8–15 |
| Quà phổ thông | Sản phẩm dễ tiếp cận | CHF 20–35 |
| Victorinox thiết kế địa danh | Cần xác nhận thương hiệu, thiết kế và điều kiện đặt hàng với nhà cung cấp | CHF 39–69 |
| Phiên bản giới hạn | Quà đặc biệt | CHF 79–119 |
| Bộ quà 3 món | Cơ chế quản lý bộ quà còn cần chốt | CHF 129–179 |
| Hidden Lucerne | Phố cổ, tháp Zyt, hiệu thuốc cổ và góc chụp ảnh | CHF 49–89/người |
| Alpine Journey | Núi, đèo và tàu hơi nước | Chưa có giá trong kế hoạch |
| Local Encounters | Nghệ nhân, làng nghề khi có đối tác phù hợp | Chưa có giá trong kế hoạch |
| Tour riêng | Báo giá theo nhóm | Theo yêu cầu, không tự áp giá tour cố định |

Đây là kỳ vọng danh mục và giá thử nghiệm, chưa phải bảng giá bán. Cuộc họp ưu tiên dao thép không gỉ, kích thước nhỏ, vừa, lớn và khắc tên; chocolate ở bước sau. Moto tour và road trip là ví dụ danh mục bổ sung. Không mặc định toàn bộ dao là Victorinox hoặc mọi ý tưởng tour đều đã sẵn sàng bán.

### 7.2 Hàng hóa

Merchant cấu hình số ngày chuẩn bị riêng từng sản phẩm và chọn tính cả cuối tuần hoặc chỉ thứ Hai đến thứ Sáu. Khách nhập ngày nhận mong muốn; hệ thống kiểm tra khả năng đáp ứng. Hàng hóa không yêu cầu tạo lịch khởi hành tour.

**Đề xuất cấu hình:** merchant tạo thuộc tính và giá trị, chọn những tổ hợp được bán. Mỗi biến thể có thể có SKU, giá, tồn và ảnh riêng. Thời gian chuẩn bị và hoa hồng mặc định lấy từ sản phẩm; việc cho phép ghi đè ở biến thể cần duyệt riêng. Tên khắc được giữ riêng cho từng món trong đơn, không tạo SKU mới. Merchant mở rộng danh mục trong các loại nghiệp vụ nền tảng hỗ trợ, không tự tạo một loại nghiệp vụ mới.

**Đề xuất kiểm tra ngày:** nếu giỏ dùng một ngày nhận chung, mọi dòng hàng phải đáp ứng ngày đó. Ngày sớm nhất cần tính theo lịch riêng từng sản phẩm, không chỉ lấy số ngày chuẩn bị lớn nhất khi cách tính ngày khác nhau. Dùng giờ nghiệp vụ Europe/Zurich và kiểm tra lại khả dụng trước xác nhận. Chế độ thứ Hai đến thứ Sáu không mặc định loại trừ ngày lễ.

**Còn mở:** khắc bắt buộc hay tùy chọn; phí, ký tự và độ dài; thời gian chuẩn bị khi khắc; bundle là SKU riêng hay trừ tồn thành phần; cutoff, ngày lễ và checkout vượt hạn; địa chỉ, giờ hoạt động, khung giờ nhận và hướng dẫn liên hệ cho từng phương án nhận. Chuẩn SKU và mức cấu hình riêng cho biến thể cũng chưa chốt.

### 7.3 Tour trong Phase 1

Merchant quản lý mô tả, giá, dịch vụ đi kèm, lịch trình và số chỗ. Thông tin bán được hiển thị trên nền tảng. Tour đặt trực tuyến có lịch khởi hành cố định. Nhóm người lớn, trẻ em, em bé và độ tuổi do merchant cấu hình.

Trang tour cần thể hiện mô tả, ảnh, thời lượng, lịch trình, phần bao gồm và không bao gồm, lịch khởi hành, điểm gặp, điều kiện tham gia, giá theo nhóm tuổi, khả dụng, chính sách thanh toán và hủy. Xác nhận booking không đồng nghĩa đã trả đủ tiền.

**Đề xuất:** cho phép giá thay đổi theo từng lịch khởi hành. Quy tắc mỗi nhóm tuổi có chiếm chỗ hay không cần hiển thị rõ. Việc đặt đồng thời không được làm vượt số chỗ.

**Còn mở:** số khách tối thiểu để chạy tour, hạn đặt và đóng bán, đổi lịch, thông tin người tham gia, chính sách thu/hoàn tiền cụ thể khi no-show, thời tiết và merchant hủy chuyến. Đối tác tour chưa có cửa hàng ở Phase 1 phối hợp cung ứng bên ngoài; không được truy cập cửa hàng Chị Ngọc chỉ vì là nhà cung cấp.

### 7.4 Lưu trú ở giai đoạn sau

*Từ 15/10/2026, Stays đã hiện là danh mục "Soon" (trống, không sản phẩm, không trình soạn thảo) trên trang khám phá và trong tab Sản phẩm của merchant; chưa bán và chưa có danh mục con (mục 7.0).*

Merchant có thể bán theo loại phòng hoặc cho thuê nguyên căn, chỗ ở riêng biệt. Merchant cấu hình nội dung, giá và lịch trống theo đêm. Khách chọn ngày check-in, check-out, số khách, phòng hoặc căn và gói giá. Booking xác nhận tự động khi đủ khả dụng cho toàn bộ kỳ ở và đáp ứng chính sách thanh toán.

**Đề xuất:** hiển thị sức chứa, tiện nghi, địa chỉ, giờ nhận và trả phòng, nội quy, ảnh, thuế và phí, chính sách trẻ em và hủy. Đặt theo loại phòng trừ số phòng khả dụng; đặt nguyên căn giữ đơn vị được đặt. Đêm check-out không tính thêm một đêm ở. Giá và chính sách của booking được giữ theo thời điểm đặt.

**Còn mở:** giá theo đêm hoặc theo người, phụ thu và thuế địa phương, số đêm tối thiểu, cấp phòng cụ thể, hạn thu số dư, no-show và đồng bộ lịch bên ngoài. Không mặc định có tích hợp Booking.com hay channel manager OTA.

### 7.5 Trải nghiệm ở giai đoạn sau

*Từ 15/10/2026, Experiences đã hiện là danh mục "Soon" (trống, không sản phẩm, không trình soạn thảo) trên trang khám phá và trong tab Sản phẩm của merchant; chưa bán và chưa có danh mục con (mục 7.0).*

Trải nghiệm chỉ có lịch cố định. Merchant cấu hình ngày, khung giờ, giá, số chỗ và nội dung. Ví dụ gồm workshop, một ngày làm nông dân hoặc một ngày làm thợ đồng hồ. Không có luồng khách đề xuất ngày tùy ý rồi chờ báo giá trong phạm vi hiện tại.

**Đề xuất:** công bố hoạt động, thời lượng, địa điểm, vật liệu và dịch vụ bao gồm, điều kiện tuổi hoặc sức khỏe, giá theo đối tượng và hạn đặt. Khách chọn lịch và đáp ứng chính sách thanh toán để xác nhận tự động. Trải nghiệm áp dụng cùng quy tắc dư nợ, hủy, hoàn tất, hoa hồng và đánh giá như các loại khác.

## 8. Vòng đời giao dịch dùng chung

Bốn loại sản phẩm dùng chung chính sách thanh toán, theo dõi dư nợ, hủy và hoàn tiền, phân quyền, điều kiện hoàn tất, hoa hồng và đánh giá. Cách kiểm tra khả dụng vẫn phụ thuộc loại sản phẩm.

| Bước nghiệp vụ | Quy tắc chung | Khác biệt theo loại |
| --- | --- | --- |
| Kiểm tra khả dụng | Chỉ xác nhận giao dịch đáp ứng khả năng cung cấp | Hàng hóa kiểm tra tồn và chuẩn bị; tour, trải nghiệm kiểm tra chỗ ở lịch chọn; lưu trú kiểm tra toàn bộ đêm |
| Xác nhận | Khả dụng hợp lệ và khoản đến hạn tại thời điểm xác nhận được đáp ứng | Hàng hóa cần merchant chấp nhận khả năng và ngày nhận trước khi yêu cầu thanh toán; tour/trải nghiệm/lưu trú tự xác nhận theo khả dụng và chính sách tiền. Chính sách không trả trước không tạo yêu cầu thu tiền giả |
| Thực hiện | Merchant hoặc nhân sự được cấp quyền cập nhật tiến độ | Chuẩn bị, bàn giao hàng; tổ chức tour hoặc trải nghiệm; cung cấp kỳ lưu trú |
| Thu tiền | Theo dõi tổng tiền, khoản đã thu, số dư, hạn thu và phương thức | Mốc thu theo chính sách sản phẩm, không mặc định mọi dịch vụ thu tại lúc bắt đầu |
| Hoàn tất | Đã cung cấp hàng hoặc dịch vụ và đã thu đủ tiền | Dịch vụ kết thúc nhưng còn nợ vẫn chưa hoàn tất |
| Sau hoàn tất | Ghi nhận hoa hồng và mở quyền đánh giá cho khách đã mua | Cùng điều kiện cho cả bốn loại |

Merchant cập nhật hoàn tất khi đủ cả hai điều kiện. Thanh toán đủ nhưng chưa cung cấp hàng hoặc dịch vụ không đủ để hoàn tất. Cung cấp xong nhưng còn nợ cũng không đủ.

**Đề xuất hiển thị:** tách tình trạng thực hiện, thanh toán và hủy hoặc hoàn tiền. Ví dụ "Đã thực hiện, còn nợ CHF 70" cần thể hiện được mà không buộc merchant đánh dấu hoàn tất. Giá, nội dung đặt, chính sách và tỷ lệ hoa hồng giữ theo phiên bản giao dịch; thay đổi cấu hình mới không sửa giao dịch cũ. Đây là định hướng nghiệp vụ, chưa áp đặt tên trạng thái hoặc cấu trúc kỹ thuật.

### 8.1 Giỏ hàng và checkout

Hàng hóa dùng giỏ hàng riêng. Tour, lưu trú và trải nghiệm checkout riêng từng booking; không gộp dịch vụ vào giỏ quà. Tất cả giao dịch xuất hiện trong tài khoản khách.

**Đã chốt B5:** khách có một giỏ hàng hóa để xem các món đã chọn. Khi gửi yêu cầu, hệ thống nhóm các món theo merchant và chính sách thanh toán; mỗi nhóm tạo một đơn riêng, kể cả hai nhóm thuộc cùng một merchant. Ví dụ một món trả đủ và một món đặt cọc tạo hai đơn. Những món cùng merchant và cùng chính sách có thể ở chung một đơn nếu ngày/phương án nhận và các điều kiện khác tương thích. Phase 1 chỉ có một merchant; giỏ nhiều merchant được bật ở giai đoạn mở rộng.

Khách thấy rõ các đơn sẽ được tạo và số tiền đến hạn của từng đơn trước khi gửi yêu cầu. Mỗi đơn hàng hóa chờ merchant xác nhận khả năng, ngày và phương án nhận trước khi yêu cầu khoản thanh toán đến hạn; các đơn có thể được xác nhận vào thời điểm khác nhau. Tổng tiền, lịch thu, trạng thái, hoàn tiền và hoa hồng được theo dõi theo từng đơn. Chưa cam kết nhiều đơn sẽ được thanh toán bằng một thao tác hoặc một giao dịch provider.

**R12 / O05 đã chốt ngày 13/10/2026:** những món khác ngày hoặc nơi/phương án nhận phải tách thành đơn riêng, kể cả cùng merchant và chính sách thanh toán. Mỗi đơn có một ngày và nơi/phương án nhận, được xác nhận, thanh toán và theo dõi riêng.

**Còn mở:** các điều kiện tương thích khác ngoài merchant, chính sách thanh toán, ngày và phương án nhận; cách xử lý khi một trong nhiều đơn bị từ chối hoặc thanh toán thất bại; khả năng provider hỗ trợ thanh toán nhiều đơn/merchant trong một thao tác. Các chi tiết này cần chốt trước khi triển khai luồng tương ứng.

## 9. Thanh toán, dư nợ và hoàn tiền

### 9.1 Chính sách từng sản phẩm

**R05 / O05 đã chốt ngày 13/10/2026:** merchant cấu hình hạn thanh toán khoản đầu cho hàng hóa theo từng sản phẩm. Khi merchant chấp nhận đơn, hệ thống lưu và hiển thị hạn cụ thể trên đơn và email cho khách theo chính sách của giao dịch; không dùng hạn cố định 48 giờ cho mọi sản phẩm. Hết hạn mà khoản đầu chưa được thanh toán thì hệ thống tự hủy đơn, lưu lý do quá hạn và thông báo cho khách, Owner và Store Manager. Khách muốn mua tiếp phải gửi yêu cầu mới để merchant xác nhận lại ngày nhận và khả năng đáp ứng. Quy tắc này không áp dụng cho đơn không trả trước hoặc phần còn lại của đơn đã đặt cọc; không tự hủy các đơn khác trong cùng giỏ. Lịch nhắc trước hạn còn cần chốt. Thanh toán đang xử lý hoặc kết quả provider đến muộn cần đối soát để không coi đơn đã hủy là được xác nhận trở lại hoặc ghi sai khoản thu.

Mặc định là trả trước 100%. Merchant có thể cấu hình đặt cọc theo tỷ lệ phần trăm hoặc không trả trước. Cả hàng hóa, tour, lưu trú và trải nghiệm đều hỗ trợ ba chế độ. Với hàng hóa, khoản trả trước chỉ được yêu cầu sau khi merchant xác nhận khả năng đáp ứng và ngày nhận; tour không bắt buộc thu toàn bộ khi đặt. Hạn thu số dư theo chính sách từng sản phẩm hoặc dịch vụ.

| Chính sách | Khoản đến hạn đầu tiên | Phần còn lại |
| --- | --- | --- |
| Trả toàn bộ | Thu 100% trực tuyến khi đáp ứng điều kiện xác nhận; với hàng hóa là sau khi merchant chấp nhận | Không còn số dư nếu khoản thu thành công |
| Đặt cọc | Thu tỷ lệ đã cấu hình khi đáp ứng điều kiện xác nhận; với hàng hóa là sau khi merchant chấp nhận | Thu phần còn lại tại mốc được công bố |
| Không trả trước | Không thu tiền khi xác nhận | Toàn bộ giá trị đến hạn theo mốc được công bố |

Khách mở giao dịch để trả dư nợ trực tuyến. Khi thu tiền ngoài hệ thống, Owner hoặc Store Manager có quyền ghi nhận khoản thu với số tiền, cách thu, thời điểm và người ghi nhận. Tiền mặt là một cách thu bên ngoài, không phải cách duy nhất.

**Kiểm soát khoản thu:** yêu cầu thanh toán chưa phải khoản đã thu; khoản online chỉ ghi nhận thành công khi được provider xác nhận. Không thu trùng hoặc làm số dư âm. Chỉ Owner được điều chỉnh hoặc hủy khoản thu bên ngoài đã ghi sai, phải nêu lý do; giữ nguyên lịch sử khoản gốc, người thao tác, thời điểm và mọi lần điều chỉnh. Phase 1 có thể giới hạn một khoản trả trước và một khoản số dư, nhưng giới hạn này chưa được chốt.

**Còn mở:** mốc thu cố định hay tương đối theo lịch dịch vụ, số lần trả, thời điểm nhắc và hủy booking quá hạn, giữ tồn hoặc chỗ trong lúc trả tiền, xử lý payment lỗi hoặc đến muộn. Tour không trả trước đã được chốt không yêu cầu thẻ bảo đảm khi đặt.

### 9.2 Tài khoản nhận tiền

**Đã chốt B3:** mỗi merchant là người bán trực tiếp cho khách đối với đơn hàng và booking của mình, được thể hiện là bên bán trên chứng từ giao dịch và quản lý việc thực hiện, hủy hoặc hoàn tiền của giao dịch đó. Nền tảng cung cấp hệ thống bán hàng; không đứng tên bán thay merchant. Mỗi merchant cấu hình tài khoản ngân hàng nhận tiền riêng và hoàn tất xác minh của nhà cung cấp thanh toán trước mở bán. Chỉ nhập số tài khoản không đủ để nhận tiền trực tuyến. Phase 1 tiền bán hàng thuộc tài khoản nhận tiền của Chị Ngọc; mô hình cửa hàng không được gắn cố định mọi merchant tương lai vào tài khoản này.

Stripe là ứng viên, chưa phải provider đã chọn. Visa là mạng thẻ, không phải lựa chọn tương đương với provider. Cần xác minh cách provider hỗ trợ từng merchant đứng tên bán, tài khoản nhận tiền riêng, pháp nhân, quốc gia, onboarding, phí, thu nhiều đợt, hoàn tiền, tranh chấp và checkout hàng hóa nhiều merchant trước quyết định tích hợp. PRD chưa chốt Stripe Connect hoặc cấu hình thanh toán cụ thể. Nền tảng có thể thu phí thuê bao theo tháng hoặc hoa hồng trên đơn/booking trong tương lai; mô hình, mức phí và cách thu chưa được quyết định.

### 9.3 Hủy, hoàn tiền và điều chỉnh

**R11a / O07 đã chốt ngày 13/10/2026:** Owner và Store Manager đều được thực hiện hoàn tiền trong cửa hàng của mình theo chính sách giao dịch. Mỗi lần hoàn lưu số tiền, lý do, người thao tác, thời điểm và kết quả. Hoàn tiền là khoản hoàn riêng, không phải sửa hoặc hủy bản ghi khoản thu gốc; quyền sửa sai khoản thu bên ngoài vẫn chỉ dành cho Owner.

Merchant cấu hình chính sách riêng từng sản phẩm hoặc tour; các loại mở rộng dùng cùng mẫu nghiệp vụ. Khách thấy chính sách trước thanh toán. Merchant xử lý từ dashboard theo quyền. Hủy giao dịch không có nghĩa đã hoàn tiền.

**Đề xuất:** theo dõi yêu cầu hoàn tiền, đang xử lý, thành công và thất bại riêng. Hoàn online đối chiếu provider; hoàn bên ngoài có lịch sử khoản hoàn. Hoàn một phần phải điều chỉnh số dư và hoa hồng theo quy tắc được duyệt. Nếu hoa hồng đã trả, ghi khoản điều chỉnh thay vì xóa lịch sử.

**O08 / O10 đã chốt ngày 13/10/2026:** Owner hoặc Store Manager cập nhật đơn hàng/booking đã hoàn tiền sang **Đã hoàn tiền (Refunded)** từ dashboard, kèm khoản hoàn thực tế, lý do, phương thức, thời điểm và người ghi nhận. Với hoàn online, kết quả được đối chiếu provider; không coi việc chọn trạng thái là lệnh chuyển tiền hoặc bằng chứng provider đã hoàn thành. Hệ thống tự tính lại số tiền hoa hồng cho guide, khách sạn hoặc đối tác được ghi nguồn và cập nhật dashboard merchant/đối tác. Giữ tỷ lệ hoa hồng đã áp dụng lúc đặt, điều chỉnh cơ sở/số tiền hoa hồng theo khoản hoàn; không sửa cấu hình tỷ lệ sản phẩm. Giữ lịch sử hoàn tất, thu tiền, hoàn tiền và khoản chi hoa hồng đã có; ghi khoản điều chỉnh thay vì xóa lịch sử, không tự thu tiền từ đối tác. Phase 1 hỗ trợ cả hoàn toàn bộ và hoàn một phần. Merchant chỉ định dòng sản phẩm/tour và số tiền hoàn trên từng dòng; hệ thống lưu khoản hoàn và tự tính lại hoa hồng tương ứng. Hoàn một phần hiển thị **Đã hoàn một phần (Partially refunded)**, hoàn toàn bộ hiển thị **Đã hoàn tiền (Refunded)**; hoa hồng đã chi dư được bù trừ theo quy tắc O08 ở mục 10.2.

**O10 — Hoàn một phần đã chốt ngày 13/10/2026:** mỗi lần hoàn ghi số tiền theo dòng, số tiền đã hoàn trước đó và phần còn có thể hoàn. Không cho tổng các khoản hoàn thành công vượt tiền thực thu hoặc hoàn vượt giá trị còn lại của dòng. Hoa hồng tính lại theo giá trị đủ điều kiện còn lại của từng dòng sau hoàn, dùng tỷ lệ lúc đặt; hoàn toàn bộ cơ sở tính hoa hồng của dòng thì hoa hồng dòng đó về 0. Giữ bản ghi hoa hồng gốc và khoản điều chỉnh, xử lý mỗi khoản hoàn thành công một lần. Hoàn tiền không tự tạo lại dư nợ phải thu của khoản đã hoàn; miễn/giảm khoản chưa thu cần thao tác và quy tắc riêng. Khoản hoàn phải phân biệt phần giá sản phẩm/tour hoặc cá nhân hóa với thuế, giao nhận và phí thanh toán: chỉ phần hoàn thuộc cơ sở hoa hồng làm giảm hoa hồng. Hoàn riêng khoản bị loại khỏi cơ sở không làm giảm hoa hồng. Quy tắc phân bổ giảm giá chung và làm tròn theo dòng cần đặc tả, bảo đảm tổng khớp giao dịch.

**O10 — No-show đã chốt ngày 13/10/2026:** Owner/Store Manager đánh dấu booking khách không đến tham gia tour là **Khách vắng mặt (No-show)**. Không chuyển booking đó sang đã cung cấp dịch vụ hoặc hoàn tất; không phát sinh hoa hồng cho đối tác và không mở quyền đánh giá tour, kể cả merchant được giữ tiền theo chính sách đã công bố. Giữ riêng trạng thái tiền, khoản đã thu và lịch sử; đánh dấu vắng mặt không tự hoàn tiền, xóa khoản thu hoặc miễn khoản còn nợ. Hoàn tiền hoặc xử lý dư nợ thực hiện riêng theo chính sách tour và quyền vận hành.

**Còn mở:** công thức số dư khi hủy, chính sách thu/hoàn tiền cụ thể cho no-show, miễn hoặc giảm dư nợ, mở lại giao dịch và quyền đánh giá sau hoàn. Không tự coi hủy là đã cung cấp dịch vụ hoặc là điều kiện ghi nhận hoa hồng.

## 10. Đối tác giới thiệu và hoa hồng

Guide, khách sạn và đối tác giới thiệu khác dùng chung cơ chế QR, link và hoa hồng. Merchant quản lý loại đối tác để so sánh kênh. Mỗi guide có định danh riêng, có thể gắn với công ty tour; quan hệ này không tự tạo khoản hoa hồng thứ hai cho công ty.

### 10.1 Ghi nhận nguồn last-click

Mỗi đơn hàng hoặc booking xét các lượt mở link đối tác hợp lệ trong **30 ngày trước thời điểm đặt**. Lượt mở gần nhất thắng theo last-click: nếu khách mở link A rồi B trong khoảng này, đơn mới thuộc B. Một lượt mở link có thể ghi nguồn cho nhiều đơn đặt trong thời hạn 30 ngày đó; sau hạn, đơn mới cần một lượt mở link hợp lệ khác. Không có chính sách hoa hồng trọn đời chỉ vì khách từng quét QR.

Nguồn được cố định trên từng đơn hoặc booking khi đặt; quét link sau đó chỉ ảnh hưởng giao dịch mới. Truy cập trực tiếp không tự xóa nguồn còn trong 30 ngày. Khi khách đăng nhập để mua, lưu nguồn hợp lệ nhận diện được cùng tài khoản và thời điểm mở link để áp dụng đúng hạn cho các đơn tiếp theo. Việc nhận diện có thể mất khi khách xóa dữ liệu trình duyệt, đổi thiết bị trước khi đăng nhập hoặc từ chối lưu trữ cần thiết.

**Còn mở:** cookie và consent, khác thiết bị trước khi đăng nhập, link của merchant khác, một đối tác làm việc với nhiều merchant và số phận nguồn đã lưu khi quan hệ với đối tác chấm dứt. Không hứa nhận diện xuyên thiết bị khi chưa có cơ chế được xác nhận.

### 10.2 Tính và chi hoa hồng

Merchant cấu hình tỷ lệ theo từng sản phẩm hoặc tour. Hoa hồng của đơn là tổng hoa hồng các dòng.

**O08 — Cơ sở hoa hồng đã chốt ngày 13/10/2026:** cơ sở từng dòng là giá sản phẩm/tour cộng phí cá nhân hóa (ví dụ khắc tên), sau giảm giá áp dụng, không gồm thuế, phí giao nhận hoặc phí thanh toán thu thêm từ khách (nếu có). Chi phí xử lý thanh toán mà merchant trả cho provider (ví dụ Stripe) không bị trừ thêm khỏi cơ sở hoa hồng; khoản này thuộc chi phí thực tế để tính lãi đóng góp. Đây là quy tắc của nền tảng, không phải chuẩn bắt buộc của mọi chương trình affiliate. Phí cá nhân hóa dùng tỷ lệ của sản phẩm/tour liên quan. Hoa hồng bằng cơ sở đủ điều kiện còn lại sau hoàn × tỷ lệ đã lưu lúc đặt. Lưu riêng các thành phần giá, giảm giá và khoản hoàn để đối chiếu; không lấy toàn bộ tiền khách trả làm cơ sở. Ví dụ: giá hàng CHF 100 + khắc CHF 10 − giảm giá CHF 10, cộng giao nhận CHF 5; các giá hàng/khắc trong ví dụ chưa gồm thuế thì cơ sở hoa hồng là CHF 100. Hoàn riêng CHF 5 giao nhận không làm giảm hoa hồng.

 Ví dụ minh họa: hai dao giá CHF 30 với tỷ lệ 10% và một dao giá CHF 80 với tỷ lệ 15% tạo tổng CHF 18, trước khi xét các điều chỉnh chưa chốt.

Hoa hồng chỉ được ghi nhận khi merchant cập nhật giao dịch hoàn tất, tức đã cung cấp hàng hoặc dịch vụ và đã thu đủ tiền. Thanh toán hoặc đặt cọc thành công chưa làm phát sinh khoản phải trả cho đối tác. Nếu hiển thị trước đó, phải ghi rõ đó là hoa hồng ước tính chưa được ghi nhận.

Merchant chi trả ngoài hệ thống rồi ghi nhận đã trả. Báo cáo tách hoa hồng đã ghi nhận, đã trả, còn phải trả và lịch sử chi. Lưu trú và trải nghiệm sau này áp dụng cùng điều kiện ghi nhận và chi trả.

**R11b / O07 đã chốt ngày 13/10/2026:** Owner và Store Manager đều được ghi nhận khoản hoa hồng đã trả bên ngoài hệ thống cho đối tác trong cửa hàng của mình. Mỗi khoản chi lưu số tiền, thời điểm chi, phương thức/thông tin đối soát, người ghi nhận và thời điểm ghi; giữ lịch sử để đối chiếu khoản đã trả và còn phải trả. Đây là ghi nhận chi thực tế, không phải lệnh chuyển tiền tự động.

**O08 — Bù trừ hoa hồng đã chốt ngày 13/10/2026:** khi hoàn tiền làm hoa hồng được hưởng thấp hơn số đã trả, hệ thống ghi khoản trả dư và tự bù trừ vào hoa hồng tiếp theo đã được ghi nhận của **cùng đối tác tại cùng merchant**. Không dùng hoa hồng ước tính của đơn chưa hoàn tất để bù trừ. Phần chưa bù hết chuyển sang kỳ sau; không bù giữa các đối tác hoặc merchant khác nhau. Giữ lịch sử khoản chi thực tế và khoản điều chỉnh; bù trừ không được ghi như một lần chuyển tiền mới. Dashboard merchant và đối tác tách hoa hồng được hưởng sau điều chỉnh, tiền thực tế đã trả, đã bù trừ, còn cần bù trừ và tiền còn phải trả sau bù trừ. Ví dụ: trả dư CHF 4, hoa hồng hợp lệ phát sinh tiếp CHF 6 thì bù CHF 4 và còn phải trả CHF 2. Không tự thu lại tiền từ đối tác.

**Còn mở:** tỷ lệ cho lưu trú theo listing hay gói giá; chu kỳ chi; chi tiết phân bổ giảm giá chung/làm tròn theo dòng và sửa sai khoản chi. Đã chốt tự tính lại số tiền hoa hồng khi merchant ghi nhận giao dịch Đã hoàn tiền (9.3). Tỷ lệ pilot trong kế hoạch kinh doanh không tự thay cấu hình sản phẩm.

### 10.3 Báo cáo riêng qua link và mã email

QR hoặc link giới thiệu là công khai và dẫn đến cửa hàng hay nội dung. Link báo cáo là riêng cho từng đối tác. Hai link khác mục đích và không được dùng thay nhau.

**R15 / O09 đã chốt ngày 13/10/2026:** báo cáo có số liệu tổng hợp theo ngày, tuần, tháng và danh sách từng đơn/booking được ghi nguồn cho đối tác. Mỗi giao dịch hiển thị mã tham chiếu, ngày đặt, tên khách, sản phẩm, giá trị, trạng thái và hoa hồng (phân biệt ước tính với đã ghi nhận). Tên khách là thông tin cá nhân duy nhất được hiển thị; không hiển thị email, số điện thoại, địa chỉ liên hệ/giao nhận, nội dung khắc, ghi chú hoặc yêu cầu tùy chỉnh khác. Đối tác mở link riêng và nhập mã xác nhận gửi tới email đã đăng ký cho phiên truy cập mới; không cần tạo mật khẩu. Chỉ có link mà chưa xác nhận email không đủ để xem báo cáo. Phiên truy cập chỉ được xem dữ liệu của đối tác tương ứng.

**Còn mở:** thời hạn phiên và mã xác nhận, giới hạn số lần thử, quy trình thay email, thu hồi và cấp lại link báo cáo. Các chi tiết này cần chốt trước khi gửi link cho đối tác thật.

## 11. Nội dung, bình luận và đánh giá

Mỗi merchant tự viết và quản lý blog của cửa hàng. Owner và Manager quản lý bài, bình luận theo quyền. Super Admin không viết hoặc quản lý blog. Nội dung có thể gồm review nhà hàng hoặc shop, tips và câu chuyện địa phương; bài chia sẻ được bằng QR hoặc link.

Khách đăng nhập mới được bình luận và trả lời thảo luận. Merchant có thể ẩn hoặc xóa bình luận blog. Quyền đó không tự cho phép xóa đánh giá sản phẩm bất lợi.

**Đã chốt ngày 14/10/2026 (R16, R17 trong đặc tả UX):** mỗi bài có tác giả là nhân sự cửa hàng, ảnh bìa, đoạn mở đầu và các phần có đề mục, dùng làm mục lục của bài. Thân bài gồm đoạn văn, ảnh kèm chú thích, video YouTube nhúng và audio thu sẵn do cửa hàng tải lên; không tạo audio bằng AI. Merchant chọn tối đa 6 quà hoặc tour đang xuất bản để liên kết với từng phiên bản ngôn ngữ của bài và tự đặt thứ tự. Mục bị ngừng xuất bản tự ẩn khỏi bài; quà hết hàng vẫn hiện kèm trạng thái hết hàng. Liên kết trong bài không thay đổi nguồn giới thiệu hoặc hoa hồng. Cuối bài có phần "Khám phá thêm" gồm tối đa 3 bài khác do merchant chọn cho từng phiên bản ngôn ngữ (R18); nếu chưa chọn thì hiện các bài mới nhất cùng ngôn ngữ. Bình luận hiện 3 chuỗi gần nhất, xem toàn bộ trong một sheet như phần đánh giá.

**Đề xuất cho blog:** trạng thái nháp và xuất bản, danh mục hoặc tag, nguồn tư liệu khi cần. Mức hỗ trợ bản đồ phải được chọn khi chốt phạm vi nội dung; chưa mặc định có dẫn đường.

Tư liệu hành trình cung cấp cảm hứng về đèo, ong, phô mai, nghề bản địa, núi, tàu và hồ. Văn bản ở ngôi thứ nhất là nội dung lấy cảm hứng, không tự coi là lời chứng thực của Erich. Nhà ong dự kiến năm 2027 và ý tưởng tham quan chưa xác nhận không được trình bày như dịch vụ đặt được.

Khách đánh giá sao và feedback sau khi đơn hoặc booking hoàn tất. Đánh giá gắn với tài khoản đã mua và áp dụng cho mọi loại sản phẩm.

**Đề xuất cho đánh giá:** thang 1–5 sao, nhãn đã mua, một đánh giá cho mỗi sản phẩm trong giao dịch hợp lệ, cho sửa và cho merchant phản hồi. Thang điểm, số lượng đánh giá, ảnh đính kèm, gộp đánh giá biến thể, moderation và xử lý sau hoàn tiền cần duyệt trước triển khai.

## 12. Widget tư vấn chuyến đi

**Đã chốt ngày 14/10/2026 (R19):** widget là giao diện trò chuyện với trợ lý AI của cửa hàng. Trợ lý hỏi từng câu dưới dạng tin nhắn; khách trả lời bằng ô nhập hoặc lựa chọn hiện ngay dưới câu hỏi, và câu trả lời hiện như tin nhắn của khách. Ở giai đoạn hiện tại trợ lý chỉ hỏi bộ câu hỏi có thứ tự cố định của cửa hàng, không rẽ nhánh, không trả lời câu hỏi tự do và không tạo kế hoạch; tất cả khách đi qua cùng danh sách câu hỏi. Khi đủ câu trả lời và email, trợ lý hiện thẻ tóm tắt để khách gửi hoặc sửa; sau khi gửi, trợ lý cảm ơn và cho biết đội ngũ cửa hàng đã nhận thông tin và sẽ liên hệ qua email để tiếp tục tư vấn, không hứa thời hạn. Giai đoạn sau, trợ lý sẽ là tác tử AI trò chuyện thật (O19).

Owner hoặc Manager cấu hình nội dung câu hỏi, loại trả lời, bắt buộc hay tùy chọn, thứ tự và email nhận yêu cầu. Mỗi cửa hàng có bộ câu hỏi và email riêng. Ví dụ gồm số người lớn, trẻ em, sở thích, ngày đến, ngày rời đi và email liên hệ; đây chưa phải bộ câu hỏi bắt buộc đã chốt.

Khi khách gửi, hệ thống lưu yêu cầu trong cửa hàng và gửi email merchant. Chị Ngọc xử lý và phản hồi qua email ngoài hệ thống. Giao diện gọi là tư vấn chuyến đi. Khả năng thu CHF 1–2 mỗi plan thuộc tương lai, chưa phải mức phí hay tính năng Phase 1.

**Đề xuất:** lưu câu hỏi cùng câu trả lời tại thời điểm gửi để thay đổi form không làm mất ngữ cảnh yêu cầu cũ. Yêu cầu vẫn tra cứu được khi thông báo email lỗi, và nhân sự có thể xử lý gửi lại.

**R08 / O12 đã chốt ngày 13/10/2026:** khách gửi yêu cầu tư vấn qua widget không cần đăng nhập; email liên hệ là bắt buộc trước khi gửi để merchant phản hồi ngoài hệ thống. Yêu cầu tư vấn không tự tạo giao dịch mua hoặc booking.

**Còn mở:** quan hệ giữa câu trả lời và hồ sơ chuyến đi; thời hạn lưu và xóa dữ liệu. Không đưa câu trả lời tự do hay dữ liệu liên hệ vào analytics hành vi.

## 13. Dashboard, dữ liệu và đo lường

Merchant cần dashboard về nguồn bán, giao dịch, giá trị, hoa hồng và hành vi. Dữ liệu cần được ghi từ đầu để phân tích về sau. Có thể dùng công cụ có sẵn, mã nguồn mở hoặc Google Analytics thay vì tự xây toàn bộ tracking; chưa chọn công cụ.

### 13.1 Nội dung dashboard

| Góc nhìn | Thông tin cần theo dõi | Quy tắc diễn giải đề xuất |
| --- | --- | --- |
| Phễu bán | Mở QR hoặc link, lượt xem, xem sản phẩm, bắt đầu đặt, xác nhận, thanh toán, hoàn tất | Tách trả cọc, thu khoản đến hạn và trả đủ. Đơn không trả trước có thể xác nhận trước lần thu đầu |
| Nguồn bán | Truy cập, giao dịch, giá trị và hoa hồng theo đối tác, loại đối tác và trang đích; thêm chiến dịch khi triển khai | Phân biệt nguồn truy cập với nguồn attribution của giao dịch |
| Bốn nhóm khách | Đoàn hoặc tự túc kết hợp trong ngày hoặc nhiều ngày; doanh thu và lãi theo nhóm | Dùng hồ sơ chuyến đi, giữ nhóm chưa xác định nếu thiếu dữ liệu; chốt cách phân loại trước pilot |
| Sản phẩm | Số lượng bán, sản phẩm bán chạy, booking tour, khách tham gia, tồn kho và số chỗ | Lưu trú bổ sung số đêm khi phát hành; phân tích biến thể theo mức cấu hình được duyệt |
| Vận hành | Đơn sắp đến hạn, booking sắp diễn ra, đơn đã cung cấp, đơn hoàn tất, hủy và no-show | Theo dõi đã cung cấp riêng với đã thu đủ để thấy việc xong nhưng còn nợ |
| Tiền | Giá trị giao dịch, tiền đã thu, dư nợ, hoàn tiền, hoa hồng đã ghi nhận và đã trả | Không cộng giá trị booking với tiền thu thành doanh thu hai lần |
| Nội dung và tư vấn | Bài được đọc, click tới sản phẩm, mở và gửi widget, nguồn dẫn đến mua | Chỉ phản ánh liên hệ hành vi, không khẳng định nguyên nhân mua |
| Hành vi và lỗi | Trang xem, CTA chính, bước rời phễu, lỗi checkout và ngày không khả dụng | Drop-off không tự giải thích động cơ khách |

Kế hoạch kinh doanh yêu cầu theo dõi "QR scans". **Đề xuất đo:** phân biệt lượt mở URL có nguồn QR với lượt mở link thông thường khi có marker. Một lượt tải URL không đủ chứng minh một lần quét QR vật lý.

### 13.2 KPI kinh doanh và tài chính

Kỳ vọng khách hàng là đặt mục tiêu thử nghiệm theo từng kênh, theo dõi riêng doanh thu tour và hàng hóa, đánh giá lãi đóng góp sau giá vốn, đóng gói, hoa hồng, phí thanh toán và giao nhận, rồi mới trừ chi phí cố định. Tỷ lệ chuyển đổi chưa có dữ liệu thực tế và không được trình bày như kết quả đã đạt.

Các định nghĩa dưới đây là đề xuất để thống nhất trước pilot.

| KPI | Cách đo đề xuất | Quyết định hỗ trợ |
| --- | --- | --- |
| Đơn và booking hoàn tất | Số giao dịch đã cung cấp và thu đủ trong kỳ, tách theo loại | Hiệu quả bán và thực hiện |
| Chuyển đổi theo kênh | Giao dịch đạt mốc đã chọn chia phiên đủ điều kiện theo cùng cửa sổ đo | So sánh kênh; phải công bố mốc xác nhận, trả cọc, trả đủ hay hoàn tất |
| Doanh thu hàng hóa và tour | Báo cáo riêng theo quy tắc ghi nhận được duyệt, thể hiện điều chỉnh hoàn tiền | Tránh tính trùng và nhầm với dòng tiền đã thu |
| Dư nợ quá hạn | Số tiền chưa thu đã vượt hạn chính sách | Ưu tiên thu và đánh giá rủi ro trả sau |
| Hủy, hoàn tiền, no-show | Đếm và tính tỷ lệ từng loại trên tập giao dịch được thống nhất | Phát hiện vấn đề sản phẩm hoặc vận hành |
| Lãi đóng góp | Doanh thu theo quy tắc đã duyệt trừ các chi phí biến đổi nêu trên | Chọn sản phẩm, giá và tỷ lệ hoa hồng có thể duy trì |
| Chênh lệch đối soát | Sai lệch chưa giải thích giữa giao dịch, khoản thu, hoàn tiền và khoản chi | Phát hiện thiếu hoặc ghi trùng tiền |
| Đối tác hoạt động | Đối tác có giao dịch hoàn tất trong kỳ | Đánh giá mạng lưới ngoài số đối tác đã mời |
| Hiệu quả tư vấn và nội dung | Yêu cầu tư vấn gửi thành công, giao dịch có tương tác nội dung theo cửa sổ thống nhất | Điều chỉnh nội dung và công việc tư vấn |

**R14 / O14 đã chốt ngày 13/10/2026:** chỉ tính và hiển thị lãi đóng góp khi có đủ chi phí thực tế của từng giao dịch; không dùng chi phí mặc định hoặc ước tính để tính lãi. Merchant nhập hoặc đối chiếu giá vốn, đóng gói, phí thanh toán, giao nhận và các chi phí biến đổi áp dụng. Khoản không phát sinh phải được xác nhận rõ là 0; dữ liệu chưa có không được coi là 0. Khi thiếu dữ liệu, báo cáo hiện "Chưa đủ dữ liệu tính lãi" và nêu khoản cần bổ sung. Báo cáo tổng hợp phải nêu mức đầy đủ dữ liệu; không trình bày lãi của một phần giao dịch như lãi của toàn bộ kỳ, sản phẩm hoặc nguồn bán. Chi phí đã phát sinh và hoa hồng phải trả vẫn cần phản ánh dù chưa chi tiền. Phí online đối chiếu provider khi có. Dashboard tài chính không thay phần mềm kế toán tổng hợp.

Công thức doanh thu, mẫu số chuyển đổi, quy tắc hoàn tiền, quyền nhập/điều chỉnh chi phí và mục tiêu số cần được duyệt trước đánh giá pilot; nguyên tắc chỉ tính lãi từ chi phí thực tế đầy đủ đã chốt ở R14.

### 13.3 Dữ liệu và quyền riêng tư

**Đề xuất yêu cầu đo lường:** sự kiện thanh toán, xác nhận, hoàn tất, hoàn tiền, ghi nhận hoa hồng và chi hoa hồng lấy từ dữ liệu nghiệp vụ đáng tin cậy. Tracking trình duyệt không là nguồn duy nhất cho báo cáo tiền. Dữ liệu hành vi dùng tên sự kiện nhất quán, thời điểm, ID giả danh và ngữ cảnh cửa hàng, sản phẩm, loại sản phẩm, nguồn.

Không đưa mật khẩu, mã xác nhận, dữ liệu thẻ, tên khắc, email hoặc nội dung chat vào analytics hành vi. Yêu cầu lưu dữ liệu từ đầu không đồng nghĩa giữ mọi dữ liệu cá nhân vô thời hạn. Công cụ được chọn cần đáp ứng thời hạn lưu, khả năng xuất, consent và chi phí đã thống nhất; chỉ gắn Google Analytics không bảo đảm lưu raw events lâu dài.

**Còn mở:** provider analytics, danh mục sự kiện, consent, thời hạn lưu, quyền truy cập và xóa, xuất dữ liệu và mục đích dùng dữ liệu lịch sử. Không cam kết đo mọi click hoặc phiên khi trình duyệt hay consent hạn chế tracking.

## 14. Pilot và lộ trình 180 ngày

### 14.1 Mạng lưới khởi động

Kế hoạch kinh doanh đặt mục tiêu pilot với **5 hướng dẫn viên, 3 khách sạn, 2 điểm bán hoặc nhận hàng và 2 đối tác tour**. Tỷ lệ thử nghiệm là **8–12% cho đơn quà và 10–15% cho booking tour hợp lệ**, điều chỉnh theo biên lợi nhuận và hợp đồng thực tế.

Đây là mục tiêu tìm đối tác và thử chính sách, chưa phải danh sách đã ký hay tỷ lệ đã áp dụng. Booking hợp lệ để ghi nhận hoa hồng phải đáp ứng quy tắc hoàn tất của sản phẩm. Phase 1 vẫn chỉ Chị Ngọc mở bán. Nhà cung cấp tour có thể phối hợp bên ngoài; điểm nhận không tự được cấp quyền cửa hàng hay hoa hồng.

### 14.2 Các mốc kinh doanh kỳ vọng

| Thời gian trong kế hoạch khách hàng | Việc chính | Kết quả kỳ vọng |
| --- | --- | --- |
| Ngày 1–30 | Chọn 6–8 mẫu sản phẩm; xây một trang khám phá chung, QR tracking và thanh toán; ký đối tác pilot | MVP nhận được đơn và ghi nguồn bán |
| Ngày 31–60 | Thử bán với đối tác; đo tỷ lệ mua, giao nhận, phản hồi và lãi từng đơn | Biết kênh nào hiệu quả |
| Ngày 61–90 | Giữ mẫu bán tốt; thử giá và thông điệp; chuẩn hóa vận hành | Có mô hình bán có thể lặp lại |
| Ngày 91–180 | Mở rộng đối tác, tour chuyên đề, đa ngôn ngữ và CRM theo kế hoạch gốc | Tăng trưởng có kiểm soát |

Lộ trình này dựa trên kế hoạch kinh doanh, với hạng mục bốn landing page được thay bằng một trang khám phá chung theo quyết định ngày 12/10/2026. Mục đa ngôn ngữ của kế hoạch gốc đã được đưa lên Phase 1 với **tiếng Anh và tiếng Đức**; giai đoạn sau chỉ bổ sung ngôn ngữ khác. **Mốc 30 ngày là mục tiêu thử nghiệm kinh doanh, không phải hạn ra mắt cam kết của đội phát triển.** Giữ toàn bộ yêu cầu Phase 1 đã chốt; chia thành các đợt phát hành sau khi ước lượng nguồn lực, ngân sách và thời gian. Phase 1 hiện gồm tour booking, tài khoản, nhân sự, blog, bình luận, đánh giá, widget và nhiều chế độ thanh toán, rộng hơn mô tả MVP 30 ngày trong nguồn. Cần xác nhận ngày bắt đầu, nguồn lực, ngân sách và phạm vi từng đợt trước chốt lịch. Lưu trú, trải nghiệm và merchant mới chưa có ngày phát hành được duyệt.

**Đề xuất cổng chuyển giai đoạn:** trước pilot tiền thật, hoàn thành điều kiện thanh toán, chính sách, năng lực cung cấp và các tiêu chí nghiệm thu Phase 1 liên quan. Trước mở rộng, đối chiếu dữ liệu pilot về chuyển đổi, chi phí, dư nợ và khả năng vận hành. Chưa đặt ngưỡng go/no-go số khi chưa có dữ liệu hoặc mục tiêu được duyệt.

### 14.3 Ba ưu tiên làm ngay

1. Hoàn thiện ba mẫu dao Chapel Bridge, Zyt Tower và Alpine Pass, kèm hai món quà giá thấp.
2. Làm một trang khám phá chung có nội dung phù hợp cả bốn nhóm khách và QR/link ghi nguồn riêng cho từng đối tác. Landing page theo chiến dịch được xem xét ở giai đoạn mở rộng.
3. Mời đối tác pilot thử giới thiệu cho khách thật trước khi nhập tồn kho lớn.

Thông điệp thương hiệu trong kế hoạch kinh doanh: "Lucerne - A place you always want to return to."

## 15. Chất lượng và tiêu chí nghiệm thu

Các tiêu chí dưới đây cụ thể hóa yêu cầu để thiết kế và kiểm thử. Phần kiểm thử là đề xuất; tiêu chí dựa trên chi tiết còn mở chỉ được chốt sau quyết định tương ứng. Chưa có phần mềm được kiểm thử trong phạm vi tài liệu này.

Yêu cầu chất lượng đề xuất gồm dùng tốt trên điện thoại, giữ dữ liệu nhập khi có lỗi, kiểm soát quyền theo cửa hàng, ngăn bán vượt tồn hoặc chỗ, không ghi trùng tiền khi thông báo lặp, truy vết thay đổi tiền và trạng thái, sao lưu và khôi phục được. Múi giờ nghiệp vụ cần nhất quán. Chưa có SLA hiệu năng hoặc độ sẵn sàng bằng số được duyệt.

| Mã | Tình huống kiểm thử | Kết quả cần đạt | Phạm vi hoặc phụ thuộc |
| --- | --- | --- | --- |
| AC01 | Khách vào qua guide hoặc trực tiếp | Xem nội dung không cần tài khoản; mua, booking và bình luận yêu cầu Google hoặc mã email | Phase 1 |
| AC02 | Owner mời Manager; Manager thử mở dữ liệu cửa hàng khác | Lời mời cấp quyền đúng cửa hàng; không truy cập dữ liệu cửa hàng khác | Phase 1; ma trận quyền cần chốt |
| AC03 | Merchant chưa được mời hoặc chưa xác minh nhận tiền | Không tự mở bán; chỉ Super Admin mời merchant | Phase 1 kiểm tra điều kiện; mở thêm merchant ở giai đoạn sau |
| AC04 | Giỏ có sản phẩm dùng hai cách tính ngày chuẩn bị | Ngày nhận chỉ hợp lệ khi từng dòng đáp ứng lịch riêng; không phụ thuộc lịch tour | Phase 1; quy tắc ngày chung, cutoff cần duyệt |
| AC05 | Hai khách cùng yêu cầu lượng hàng hoặc chỗ cuối; hai nhân sự chấp nhận đơn hàng hóa đồng thời | Yêu cầu hàng hóa chưa giữ tồn; chỉ chấp nhận khi giữ đủ tồn cho toàn bộ đơn, không xác nhận vượt khả dụng; hủy giải phóng phần giữ chưa bàn giao. Booking tour cần trả ngay/đặt cọc giữ chỗ 15 phút, hết hạn chưa hoàn tất thanh toán thì trả chỗ và yêu cầu đặt lại. Kết quả provider đến muộn được đối soát | Phase 1; thời điểm giữ tồn hàng hóa đã chốt, cơ chế provider cần đặc tả |
| AC06 | Tour áp dụng đặt cọc 30% trong dữ liệu thử | Thu 30%, xác nhận nếu đủ chỗ, hiển thị còn 70%; chưa hoàn tất | Phase 1; 30% chỉ là ví dụ |
| AC07 | Sản phẩm áp dụng không trả trước | Tour xác nhận và giữ chỗ khi đủ chỗ mà không yêu cầu thẻ; hàng hóa xác nhận sau khi merchant chấp nhận ngày nhận và khả năng đáp ứng. Không ghi đã thu tiền; hiển thị số dư và hạn thu | Phase 1 |
| AC08 | Khách trả số dư online hoặc Manager ghi thu bên ngoài | Số dư cập nhật đúng; có số tiền, cách thu, thời điểm và người ghi; không ghi trùng | Phase 1 |
| AC09 | Đã cung cấp dịch vụ nhưng còn nợ; đã trả đủ nhưng chưa cung cấp; khách no-show dù merchant giữ tiền theo chính sách | Các trường hợp đều chưa hoàn tất, chưa ghi nhận hoa hồng, chưa mở đánh giá; no-show có trạng thái riêng và giữ lịch sử tiền | Phase 1 và mọi loại mở rộng |
| AC10 | Owner hoặc Store Manager hoàn tất khi đã cung cấp và thu đủ | Hoa hồng ghi đúng một lần, khách đã mua được đánh giá; lưu người và thời điểm hoàn tất | Phase 1 |
| AC11 | Khách mở referral A rồi B; đặt một đơn trong 30 ngày và một đơn sau khi lượt mở cuối đã quá 30 ngày | Đơn đầu thuộc B theo last-click; đơn sau không tự ghi cho B nếu không có lượt mở link mới. Nguồn đơn đầu được khóa lúc đặt, không bị đổi bởi lần mở link sau đó | Phase 1; nhận diện khách và consent cần đặc tả |
| AC12 | Đối tác mở link báo cáo riêng, rồi nhập mã gửi tới email đã đăng ký | Link bị chuyển tiếp một mình không mở được báo cáo; phiên hợp lệ chỉ có dữ liệu đối tác tương ứng, có chi tiết từng giao dịch và tên khách, không có email, số điện thoại, địa chỉ liên hệ/giao nhận, nội dung khắc hoặc yêu cầu tùy chỉnh của khách | Phase 1; chốt hạn phiên/mã và thu hồi link |
| AC13 | Merchant ghi chi hoa hồng; hoàn tiền làm phát sinh khoản trả dư rồi có hoa hồng mới | Cập nhật tiền đã trả và còn phải trả; tự bù trả dư vào hoa hồng đã ghi nhận tiếp theo của cùng đối tác/merchant, phần chưa bù hết chuyển kỳ sau. Giữ lịch sử tiền chi, hoàn và bù trừ; không ghi trùng bù trừ hoặc tự chuyển/thu tiền | Phase 1 |
| AC14 | Hủy giao dịch, hoàn online thất bại hoặc merchant cập nhật giao dịch đã hoàn tất sang Đã hoàn tiền | Hủy không tự thành hoàn tiền; không báo đã hoàn nếu chưa thành công. Khi merchant ghi nhận khoản hoàn thực tế theo dòng và trạng thái Refunded hoặc Partially refunded, hệ thống tự tính lại số tiền hoa hồng trên dashboard đối tác, giữ tỷ lệ lúc đặt và lịch sử, không điều chỉnh trùng khi ghi nhận lặp | Phase 1; hoàn toàn bộ/một phần và bù trừ hoa hồng đã chi đã chốt |
| AC15 | Merchant sửa giá hoặc chính sách sau đặt | Giao dịch cũ giữ giá và chính sách đã đặt, không tự thay số dư | Đề xuất giữ phiên bản |
| AC16 | Merchant xuất bản blog, khách gửi bình luận | Merchant quản lý bài và bình luận; khách phải đăng nhập; Super Admin không biên tập blog | Phase 1 |
| AC17 | Khách chưa hoàn tất giao dịch hoặc mở giao dịch người khác | Không tạo được đánh giá đã mua không hợp lệ | Phase 1 |
| AC18 | Khách chưa đăng nhập đi qua widget, merchant sửa câu hỏi sau đó | Không yêu cầu đăng nhập; cần email liên hệ trước khi gửi. Câu hỏi đi tuần tự, không rẽ nhánh; yêu cầu được lưu, thông báo email được gửi; bản cũ giữ ngữ cảnh theo đề xuất | Phase 1 |
| AC19 | Dashboard có đơn đặt cọc, đơn không trả trước và giao dịch thiếu chi phí thực tế | Tách giá trị giao dịch, tiền thu, số dư và hoàn tất; không cộng trùng doanh thu. Chỉ tính lãi đóng góp khi đủ chi phí thực tế từng giao dịch; thiếu dữ liệu thì nêu khoản thiếu, không coi là 0 hoặc dùng ước tính, báo cáo tổng hợp nêu mức đầy đủ dữ liệu | Phase 1; R14 đã chốt nguyên tắc chi phí, công thức KPI còn mở |
| AC20 | Có giao dịch thuộc cả bốn nhóm, giao dịch thiếu ngày và một khách có nhiều chuyến đi | Báo cáo phân loại từng đơn hàng hoặc booking theo câu trả lời của chính giao dịch đó và quy tắc được duyệt; giao dịch thiếu câu trả lời xếp vào nhóm chưa xác định; không dùng referral thay lựa chọn đoàn hoặc tự túc | Phase 1; nhiều chuyến đi đã chốt 14/10/2026; chốt diễn giải ngày và dữ liệu thiếu |
| AC21 | Khách đặt lưu trú nhiều đêm | Mọi đêm đều có khả dụng; không tính thêm đêm check-out theo đề xuất | Giai đoạn sau |
| AC22 | Khách đặt một trải nghiệm | Chọn lịch cố định, kiểm tra chỗ, áp dụng chính sách tiền và điều kiện hoàn tất chung | Giai đoạn sau |
| AC23 | Giỏ hàng hóa chứa nhiều merchant | Chỉ checkout chung khi tương thích; tạo đơn riêng; mỗi merchant chỉ xem đơn của mình | Giai đoạn sau; chốt provider và tương thích |
| AC24 | Khách thuộc một trong bốn nhóm mở trang khám phá chung qua QR/link đối tác hoặc trực tiếp | Có thể khám phá quà, tour, bài viết và tư vấn mà không phải chọn nhóm trước; referral vẫn được ghi theo cửa sổ 30 ngày khi nhận diện được nguồn hợp lệ; không yêu cầu bốn landing page riêng | Phase 1 |
| AC25 | Khách gửi yêu cầu mua hàng hóa với ngày nhận mong muốn | Chưa thu tiền; hiển thị đang chờ người bán xác nhận, không đưa thời gian phản hồi dự kiến. Chỉ sau khi merchant chấp nhận ngày và khả năng đáp ứng, hệ thống mới yêu cầu khoản thanh toán đến hạn; nếu không thu trước, đơn được xác nhận mà không ghi tiền đã thu | Phase 1; hạn phản hồi nội bộ và xử lý ngày thay thế còn mở |
| AC26 | Merchant cấu hình nhiều điểm/cách nhận; khách gửi yêu cầu hàng hóa | Khách chọn một phương án nhận; đơn lưu lựa chọn đó. Merchant xác nhận cả ngày và phương án nhận trước khi yêu cầu khoản thanh toán đến hạn; thay đổi qua email được cập nhật lại trên đơn | Phase 1; chi tiết giờ và địa chỉ còn mở |
| AC27 | Booking tour không trả trước đến hạn thanh toán mà chưa thu tiền | Khách nhận nhắc theo chính sách tour; hệ thống xử lý trạng thái booking và số chỗ đúng quy tắc quá hạn đã công bố, không tự trừ thẻ hoặc ghi đã thanh toán | Phase 1; thời điểm nhắc, gia hạn và hủy cụ thể còn mở |
| AC28 | Giỏ cùng merchant có món trả đủ và món đặt cọc | Khách thấy hai đơn trước khi gửi yêu cầu; mỗi đơn chờ merchant xác nhận và theo dõi khoản đến hạn, số dư, hủy/hoàn tiền riêng | Phase 1; điều kiện gộp ngoài chính sách tiền còn mở |
| AC29 | Store Manager ghi nhận khoản thu bên ngoài, hoàn tất giao dịch đã cung cấp và thu đủ; sau đó cần sửa khoản thu ghi sai | Manager thực hiện được hai thao tác đầu, không sửa/hủy khoản thu; chỉ Owner được điều chỉnh hoặc hủy khoản thu với lý do. Lịch sử gốc, người thao tác và thời điểm được giữ lại | Phase 1 |
| AC30 | Khách chuyển giữa tiếng Anh và tiếng Đức khi xem sản phẩm, đặt hàng hoặc tour, thanh toán và theo dõi giao dịch; merchant xuất bản sản phẩm/tour bằng một ngôn ngữ | Giao diện, thông tin do hệ thống tạo và thông báo khách dùng ngôn ngữ đã chọn. Nội dung merchant thiếu bản dịch hiển thị nguyên bản hiện có kèm thông báo ngôn ngữ; không khóa xuất bản chỉ vì thiếu ngôn ngữ thứ hai. Giá, ngày, trạng thái và điều kiện giao dịch giữ nguyên ý nghĩa | Phase 1; ngôn ngữ mặc định và bản dịch widget còn mở |
| AC31 | Merchant liên kết quà và tour với một bài viết, sau đó ngừng xuất bản một mục | Mỗi phiên bản ngôn ngữ có danh sách riêng, tối đa 6 mục, chỉ chọn được mục đang xuất bản; bài hiện đúng thứ tự merchant đặt; mục bị ngừng xuất bản tự ẩn, quà hết hàng hiện trạng thái hết hàng; nguồn giới thiệu và hoa hồng không đổi | Phase 1 |
| AC32 | Khách mở bài viết có ảnh, video và audio | Có ảnh bìa, tác giả, ngày đăng và thời gian đọc, mục lục theo phần đánh dấu phần đang đọc; video chỉ tải trình phát khi khách bấm phát; audio là bản thu sẵn do cửa hàng tải lên, không tạo bằng AI | Phase 1 |
| AC33 | Khách đọc xong một bài viết | Phần "Khám phá thêm" hiện tối đa 3 bài đã xuất bản cùng ngôn ngữ, theo lựa chọn của merchant hoặc các bài mới nhất nếu merchant chưa chọn; không hiện chính bài đang đọc, bài nháp hoặc bài khác ngôn ngữ | Phase 1 |
| AC34 | Khách mở tư vấn chuyến đi | Giao diện trò chuyện với trợ lý AI: mỗi lần một câu hỏi của cửa hàng dạng tin nhắn, ô nhập hoặc lựa chọn theo loại câu hỏi, câu trả lời hiện như tin nhắn của khách; không trả lời câu hỏi tự do, không tạo kế hoạch; tóm tắt có Gửi và Sửa; sau khi gửi có lời cảm ơn và thông báo liên hệ qua email, không hứa thời hạn | Phase 1 |

## 16. Rủi ro và điều kiện phụ thuộc

Bảng sau là đánh giá đề xuất để chuẩn bị triển khai, chưa phải kết quả kiểm chứng thực tế.

| Rủi ro | Ảnh hưởng | Cách xử lý cần chuẩn bị |
| --- | --- | --- |
| Phạm vi Phase 1 lớn hơn MVP 30 ngày của kế hoạch kinh doanh | Nếu coi mốc thử nghiệm là hạn ra mắt cố định, kế hoạch sẽ thiếu cơ sở và pilot có thể chậm | Ước lượng nguồn lực rồi chia đợt phát hành, không cắt yêu cầu Phase 1 đã chốt chỉ để khớp mốc 30 ngày |
| Tồn, chỗ hoặc năng lực khắc ngoài hệ thống không khớp website | Xác nhận giao dịch không thực hiện được | Chốt cách cập nhật khả dụng, giữ chỗ khi thanh toán và người chịu trách nhiệm vận hành |
| Khách rời địa phương trước khi quà sẵn sàng | Lỡ nhận hàng, hủy hoặc hỗ trợ khẩn | Chốt lịch chuẩn bị, cutoff, hướng dẫn nhận và cách xử lý đơn không kịp |
| Không trả trước hoặc đặt cọc nhưng khách không trả số dư | Có booking chiếm chỗ, việc đã làm nhưng còn nợ | Công bố hạn thu, nhắc thanh toán và cách hủy/nhả chỗ theo từng tour; dashboard ưu tiên dư nợ |
| Provider hoặc pháp nhân không hỗ trợ mô hình tiền mong muốn | Không nhận tiền, hoàn tiền hoặc mở rộng merchant được | Xác minh bằng tài khoản và luồng thử phù hợp trước khi nhận tiền thật |
| Hoàn tiền và hoa hồng không được đối soát nhất quán | Trả thừa, thiếu hoặc sai lãi | Chốt công thức điều chỉnh, quyền thao tác và lịch sử khoản thu, hoàn, chi |
| Link báo cáo riêng bị chia sẻ hoặc lộ | Người khác thử truy cập báo cáo đối tác | Yêu cầu thêm mã gửi tới email đối tác cho phiên mới; giới hạn dữ liệu, có cách thu hồi và thay link trước pilot |
| Thiếu chi phí hoặc trộn tiền thu với doanh thu | Dashboard báo lãi sai | Công bố định nghĩa, đánh dấu chi phí thiếu và đối chiếu provider |
| Nội dung, thương hiệu hoặc ý tưởng dịch vụ chưa được xác minh | Khách hiểu sai sản phẩm hoặc đặt dịch vụ chưa có | Xác minh quyền Victorinox, ảnh và nguồn; merchant chịu trách nhiệm nội dung và khả năng bán |
| Một merchant hoặc người vận hành chính vắng mặt | Đơn chưa xử lý, khách không được hỗ trợ | Chốt người dự phòng, quyền Manager và kênh liên hệ |

Điều kiện vận hành trước pilot gồm danh mục thật có giá, ảnh và quyền sử dụng; lịch, tồn và năng lực cung cấp; chính sách thương mại; tài khoản nhận tiền đã xác minh; danh sách đối tác và điều khoản hoa hồng; người nhận trách nhiệm giao hàng hoặc tổ chức tour; email thông báo; người trực dashboard và nguồn dữ liệu chi phí.

Có PRD không đồng nghĩa đã ký hợp đồng, đủ điều kiện nhận tiền hoặc đủ năng lực thực hiện. Các điều kiện này cần được kiểm chứng trước giao dịch thật.

## 17. Những quyết định còn mở

Bảng này tập hợp lựa chọn ảnh hưởng phạm vi, hành vi hoặc lịch phát hành. Vai trò tham gia là đề xuất để phân công; chưa coi là chủ nhiệm đã nhận việc.

| Mã | Quyết định cần chốt | Mốc cần có | Bên cần tham gia |
| --- | --- | --- | --- |
| O01 | Tên thương hiệu, tiền tệ, ngôn ngữ mặc định và bản dịch widget. Đã chốt EN/DE khi ra mắt; sản phẩm/tour được xuất bản bằng một ngôn ngữ, thiếu bản dịch thì hiện bản có sẵn kèm thông báo; blog xuất bản riêng theo ngôn ngữ | Trước chốt UX và nội dung | Chủ sản phẩm, merchant |
| O02 | Danh mục pilot, SKU, nguồn cung, giá, quyền Victorinox, ảnh và hai quà giá thấp | Trước mở bán | Merchant, nhà cung cấp |
| O03 | Thuộc tính, biến thể, SKU, khắc, phí và ký tự, lead time theo khắc, bundle; mức tùy chỉnh hoa hồng biến thể | Trước đặc tả hàng hóa | Merchant, sản phẩm, thiết kế |
| O04 | Cutoff, ngày lễ, múi giờ, ngày nhận chung, địa chỉ và giờ/khung giờ của từng phương án nhận, hạn phản hồi/lịch nhắc merchant nội bộ và xử lý khách không chấp nhận ngày hoặc nơi nhận đề xuất mới. Đã chốt không hiển thị thời gian phản hồi dự kiến cho khách | Trước nhận đơn thật | Merchant, vận hành |
| O05 | Số lần trả, lịch nhắc và xử lý quá hạn số dư, đóng phiên/đối soát thanh toán provider; điều kiện gộp ngoài merchant/chính sách tiền và xử lý khi một đơn trong giỏ bị từ chối. Đã chốt giữ tồn hàng hóa khi merchant chấp nhận, hủy giải phóng phần chưa bàn giao; hạn trả khoản đầu do merchant cấu hình theo sản phẩm, hết hạn chưa trả thì tự hủy và phải gửi yêu cầu mới; giữ chỗ tour 15 phút cho thanh toán đầu, hết hạn chưa hoàn tất thì trả chỗ và đặt lại | Trước đặc tả checkout và booking | Sản phẩm, merchant, kỹ thuật |
| O06 | Provider và cấu hình hỗ trợ merchant đứng tên bán, pháp nhân, xác minh tài khoản, quy trình hoàn tiền/tranh chấp, thuế và hóa đơn | Trước tiền thật | Chủ sản phẩm, merchant, provider và tư vấn phù hợp |
| O07 | Ma trận quyền còn lại của Owner, Manager, Super Admin; đăng nhập nhân sự và lời mời. Đã chốt Owner/Manager được hoàn tiền và ghi nhận hoa hồng đã chi; sửa/hủy khoản thu bên ngoài chỉ dành cho Owner | Trước cấp tài khoản vận hành | Chủ sản phẩm, merchant |
| O08 | Consent, khác thiết bị trước khi đăng nhập, liên merchant, xử lý nguồn khi chấm dứt đối tác; phân bổ giảm giá chung/làm tròn theo dòng và sửa sai khoản chi. Đã chốt cơ sở là giá sản phẩm/tour và cá nhân hóa sau giảm giá, loại thuế/giao nhận/phí thanh toán thu thêm từ khách, không trừ chi phí xử lý thanh toán merchant chịu; bù trừ trả dư vào hoa hồng tiếp theo của cùng đối tác/merchant, chuyển phần còn lại sang kỳ sau; tự tính lại số tiền hoa hồng khi merchant ghi nhận Đã hoàn tiền; cửa sổ 30 ngày cho từng đơn, last-click và khóa nguồn khi đặt | Trước ghi nguồn và tính hoa hồng thật | Sản phẩm, merchant, đối tác |
| O09 | Hạn phiên và mã email, giới hạn lần thử, thay email đối tác, thu hồi và cấp lại link báo cáo riêng. Đã chốt xem từng giao dịch và tên khách, không xem thông tin liên hệ hoặc yêu cầu tùy chỉnh | Trước gửi link cho đối tác | Sản phẩm, kỹ thuật |
| O10 | Hủy, no-show, đổi lịch, merchant hủy tour, miễn nợ và mở lại giao dịch. Đã chốt no-show không hoàn tất, không hoa hồng/đánh giá dù được giữ tiền; hoàn toàn bộ/một phần theo dòng, merchant cập nhật Refunded/Partially refunded kèm khoản hoàn thực tế, hệ thống tự tính lại số tiền hoa hồng | Trước mở bán | Merchant, vận hành |
| O11 | Số khách tối thiểu, hạn đặt, nhóm tuổi chiếm chỗ, giá theo lịch khởi hành, dữ liệu người tham gia và luồng báo giá tour riêng | Trước bán tour tương ứng | Merchant, đối tác tour, sản phẩm |
| O12 | Hình thức và đợt phát hành bản đồ, chăm sóc sau chuyến đi; liên hệ dữ liệu widget với hồ sơ chuyến đi. Đã chốt widget không cần đăng nhập, email liên hệ bắt buộc. Ngày 14/10/2026 chốt bài viết có video YouTube nhúng và audio thu sẵn do cửa hàng tải lên, không tạo audio bằng AI (R17) | Trước chốt backlog nội dung và tư vấn | Merchant, sản phẩm, thiết kế |
| O13 | Địa điểm của ngày đến và ngày rời đi, cách phân bốn nhóm. Đã chốt hồ sơ tùy chọn sau khi gửi yêu cầu mua hàng hoặc xác nhận booking, thiếu dữ liệu thì giữ nhóm chưa xác định. Ngày 14/10/2026 chốt nhiều chuyến đi: câu trả lời gắn với từng đơn hàng hoặc booking, sửa trên đơn hoặc booking đó trong tài khoản, báo cáo phân loại từng giao dịch theo câu trả lời của chính nó | Trước pilot đo lường | Chủ sản phẩm, merchant, phân tích dữ liệu |
| O14 | Analytics provider, sự kiện, consent, lưu và xuất dữ liệu, công thức KPI, quyền nhập/điều chỉnh chi phí và mục tiêu số. Đã chốt chỉ tính lãi khi đủ chi phí thực tế từng giao dịch; thiếu dữ liệu không coi là 0 hoặc thay bằng ước tính | Trước đánh giá pilot | Sản phẩm, merchant, phân tích dữ liệu |
| O15 | Thang sao, số lượt, sửa, ảnh, gộp biến thể, moderation và đánh giá sau hoàn tiền | Trước bật đánh giá | Chủ sản phẩm, merchant |
| O16 | Ngày bắt đầu, ngân sách, đội triển khai, thứ tự và phạm vi mỗi đợt phát hành Phase 1, ngưỡng tiếp tục pilot; mốc 30 ngày chỉ là mục tiêu thử nghiệm | Trước cam kết lịch | Chủ sản phẩm, merchant, đội triển khai |
| O17 | Chọn phí thuê bao tháng hay hoa hồng theo đơn/booking cho nền tảng, mức và cách thu; onboarding merchant mới, checkout nhiều merchant và lỗi một phần | Trước mở rộng merchant hoặc trước khi bật thu phí | Chủ sản phẩm, merchant, provider |
| O18 | Chính sách chi tiết lưu trú và trải nghiệm, ngôn ngữ bổ sung ngoài Anh/Đức, CRM, AI và phí plan | Trước từng giai đoạn tương ứng | Chủ sản phẩm và merchant liên quan |
| O19 | Tác tử AI trò chuyện thật cho tư vấn chuyến đi: phạm vi trả lời, nguồn dữ liệu (sản phẩm, tour, bài viết), giới hạn và chuyển cho nhân sự, ngôn ngữ, chi phí, lưu và xóa hội thoại, consent. Giai đoạn hiện tại (R19) chỉ hỏi bộ câu hỏi cố định | Trước khi bật tác tử AI | Chủ sản phẩm, merchant, kỹ thuật |

Ưu tiên trước khi lập kế hoạch phát triển là phạm vi từng đợt, quy tắc thanh toán và hủy, quyền nhân sự, attribution, dữ liệu hồ sơ chuyến đi và khả năng provider. Chi tiết lưu trú, trải nghiệm hoặc mô hình thu phí tương lai không cần làm chậm pilot nếu chưa nằm trong đợt phát hành đó.

## 18. Nguồn và thay đổi phiên bản

### 18.1 Nguồn nội bộ

- Quyết định cuộc họp và xác nhận của người dùng trong hội thoại, gồm yêu cầu bổ sung hồ sơ chuyến đi để phân tích cả bốn nhóm khách.
- `client-resources/Lucerne_Keepsake_Ke_hoach_kinh_doanh.pdf`, hai trang. Các mục 2–8 được phản ánh tại phần 7, 6, 14, 13 và 14.3 của PRD này; đề xuất bốn landing page trong nguồn được thay bằng một trang khám phá chung theo xác nhận của người dùng ngày 12/10/2026.
- `client-resources/day-tripper-group.jpeg`, `multi-days-group.jpeg`, `long-stay-traveller.jpeg`, `day-tripper.jpeg`.
- `client-resources/Hanh_trinh_Thuy_Si_cam_hung_Eric_Tieng_Viet.pdf`.
- `client-resources/Thuy_Si_Hanh_Trinh_Erich_Ban_Mo_Rong_Tieng_Viet.pdf`. Bản có hậu tố `(1)` có nội dung tệp giống hệt, đã đối chiếu SHA-256 ngày 12/10/2026.
- `Swiss_Stories_and_Gifts_PRD_v1.md`, chỉ đối chiếu lịch sử. Bản v1 được giữ nguyên.

### 18.2 Khác biệt chính với v1

Phase 1 chuyển thành một cửa hàng có Owner và Manager, bán cả hàng hóa và tour, với mô hình quyền sẵn cho nhiều merchant được mời sau này. Khách đăng nhập bằng Google hoặc mã email để mua; ngày nhận quà dựa vào lịch chuẩn bị từng sản phẩm. Mọi loại dùng chính sách tiền linh hoạt và chỉ hoàn tất khi đã cung cấp và thu đủ. Hoa hồng theo sản phẩm, last-click, ghi nhận sau hoàn tất và chi trả ngoài hệ thống. Merchant tự quản lý blog; widget là biểu mẫu tuần tự. Lưu trú và trải nghiệm có đặc tả giai đoạn sau.

Các kỳ vọng kinh doanh về danh mục, phễu, pilot, lộ trình 180 ngày, dashboard và tài chính được giữ trong phạm vi đánh giá sản phẩm. Cập nhật ngày 12/10/2026: một trang khám phá chung phục vụ cả bốn nhóm khách thay cho bốn landing page riêng; landing page theo chiến dịch là khả năng mở rộng. Đơn hàng hóa chuyển sang chờ merchant xác nhận khả năng và ngày nhận trước khi yêu cầu thanh toán khoản đến hạn. Chi tiết cấu hình biến thể, giá theo lịch khởi hành, diễn giải ngày chuyến đi và các lựa chọn chưa chốt tiếp tục là đề xuất hoặc quyết định mở.

### 18.3 Tài liệu tham khảo về mô hình

Các nguồn dưới đây đã được đối chiếu ngày 12/10/2026 để tham khảo mô hình. Chúng không xác nhận chính sách hoặc cấu hình provider đã phù hợp với dự án.

- [Awin: Tracking FAQs](https://help.awin.com/docs/tracking-faqs).
- [KKday: Terms and Conditions](https://www.kkday.com/static/en/about/TermsAndConditions.html).
- [Klook: Pay Later](https://www.klook.com/faq/category-56-question-16346/).
- [Booking.com: Payment timings](https://developers.booking.com/demand/docs/payments/payments-timings) và [Payment schedules](https://developers.booking.com/demand/docs/payments/payments-schedules).
- [Shopee: Mua hàng nhiều seller](https://help.shopee.com.my/portal/4/article/78747) và [voucher cho checkout nhiều đơn](https://help.shopee.com.my/portal/4/article/171566).
- [Amazon Business: Split charges](https://business.amazon.co.uk/en/blog/match-orders-split-charges).
