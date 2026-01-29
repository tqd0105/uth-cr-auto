import { NextRequest, NextResponse } from 'next/server';

const isProduction = process.env.NODE_ENV === 'production';

// Dynamic import based on environment
const getDb = async () => {
  if (isProduction) {
    return await import('@/lib/db-postgres');
  }
  return await import('@/lib/db');
};

const MIN_DONATION = 12000; // 12k VND
const CURRENT_PERIOD_ID = 75; // Đợt ĐKHP hiện tại - có thể đưa vào env hoặc database

// Thông tin tài khoản ngân hàng (có thể đưa vào env)
const BANK_INFO = {
  bank_name: process.env.BANK_NAME ?? 'MSB' ,
  account_number: process.env.BANK_ACCOUNT ?? '6801112005',
  account_name: process.env.BANK_ACCOUNT_NAME  ?? 'TRAN QUANG DUNG',
  bank_bin: process.env.BANK_BIN ?? '970426', 
};

// GET - Get donation info, status, and pro status for current user
export async function GET(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const { donationDb } = await getDb();

    // Get user's donations
    const donations = await donationDb.findBySession(userSession);
    
    // Check if user has active pro for current period
    const isPro = await donationDb.hasActivePro(userSession, CURRENT_PERIOD_ID);
    
    // Get total donated
    const totalDonated = await donationDb.getTotalDonated(userSession);

    // Get pending donation if any
    const pendingDonation = donations.find(d => d.status === 'pending');

    return NextResponse.json({
      success: true,
      data: {
        is_pro: isPro,
        active_period_id: isPro ? CURRENT_PERIOD_ID : null,
        total_donated: totalDonated,
        donations,
        pending_donation: pendingDonation || null,
        min_donation: MIN_DONATION,
        current_period_id: CURRENT_PERIOD_ID,
        bank_info: {
          name: BANK_INFO.bank_name,
          account: BANK_INFO.account_number,
          account_name: BANK_INFO.account_name,
          bank_bin: BANK_INFO.bank_bin
        }
      }
    });

  } catch (error) {
    console.error('Get donation info error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lấy thông tin donate' },
      { status: 500 }
    );
  }
}

// POST - Create new donation request
export async function POST(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const { donationDb, userConfigDb } = await getDb();

    const userConfig = await userConfigDb.findBySession(userSession);
    if (!userConfig) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { email, amount, student_id, note } = body;

    // Validate
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập email' },
        { status: 400 }
      );
    }

    if (!amount || amount < MIN_DONATION) {
      return NextResponse.json(
        { success: false, message: `Số tiền tối thiểu là ${MIN_DONATION.toLocaleString('vi-VN')}đ` },
        { status: 400 }
      );
    }

    // Check if already has pending donation
    const existingDonations = await donationDb.findBySession(userSession);
    const hasPending = existingDonations.some(d => d.status === 'pending');
    if (hasPending) {
      return NextResponse.json(
        { success: false, message: 'Bạn đã có yêu cầu donate đang chờ xử lý' },
        { status: 400 }
      );
    }

    // Pro users can still donate more - removed isPro check

    // Generate transfer content
    const transferContent = `UTH ${email}`;

    // Create donation record
    const result = await donationDb.insert({
      user_session: userSession,
      email,
      student_id,
      amount,
      transfer_content: transferContent,
      registration_period_id: CURRENT_PERIOD_ID,
      note
    });

    // Generate VietQR URL
    const qrUrl = generateVietQR(amount, transferContent);

    return NextResponse.json({
      success: true,
      message: 'Đã tạo yêu cầu donate',
      data: {
        id: result.lastInsertRowid,
        amount,
        transfer_content: transferContent,
        qr_url: qrUrl,
        bank_info: {
          name: BANK_INFO.bank_name,
          account: BANK_INFO.account_number,
          account_name: BANK_INFO.account_name,
          bank_bin: BANK_INFO.bank_bin
        },
        is_pro: false,
        current_period_id: CURRENT_PERIOD_ID,
        total_donated: await donationDb.getTotalDonated(userSession),
        donations: await donationDb.findBySession(userSession),
        pending_donation: {
          amount,
          transfer_content: transferContent,
          status: 'pending'
        }
      }
    });

  } catch (error) {
    console.error('Create donation error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tạo yêu cầu donate' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel pending donation
export async function DELETE(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const { donationDb } = await getDb();

    // Find pending donation for this user
    const donations = await donationDb.findBySession(userSession);
    const pendingDonation = donations.find(d => d.status === 'pending');

    if (!pendingDonation) {
      return NextResponse.json(
        { success: false, message: 'Không có donation đang chờ xử lý' },
        { status: 404 }
      );
    }

    await donationDb.delete(pendingDonation.id!);

    return NextResponse.json({
      success: true,
      message: 'Đã hủy yêu cầu donate'
    });

  } catch (error) {
    console.error('Delete donation error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi hủy donation' },
      { status: 500 }
    );
  }
}

// Generate VietQR URL
function generateVietQR(amount: number, content: string): string {
  const { bank_bin, account_number, account_name } = BANK_INFO;
  
  // VietQR format: https://img.vietqr.io/image/{BANK_BIN}-{ACCOUNT_NUMBER}-{TEMPLATE}.png?amount={AMOUNT}&addInfo={CONTENT}&accountName={NAME}
  const template = 'compact2'; // hoặc 'compact', 'qr_only', 'print'
  const encodedContent = encodeURIComponent(content);
  const encodedName = encodeURIComponent(account_name);
  
  return `https://img.vietqr.io/image/${bank_bin}-${account_number}-${template}.png?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`;
}
