Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms

$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Betting Intelligence OS - Kalshi Linker" 
        Height="480" Width="560" 
        WindowStartupLocation="CenterScreen" 
        Topmost="True" 
        Background="#0b0f19" 
        ResizeMode="NoResize">
    <Window.Resources>
        <Style TargetType="Button">
            <Setter Property="FontFamily" Value="Segoe UI Semibold"/>
            <Setter Property="FontSize" Value="14"/>
            <Setter Property="Padding" Value="16,10"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="BorderThickness" Value="0"/>
        </Style>
    </Window.Resources>
    
    <Grid Margin="24">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- Header -->
        <StackPanel Grid.Row="0" Margin="0,0,0,16">
            <TextBlock Text="BETTING INTELLIGENCE OS" Foreground="#10b981" FontWeight="Bold" FontSize="12"/>
            <TextBlock Text="Link Your Kalshi Account" Foreground="#f8fafc" FontWeight="Bold" FontSize="22" Margin="0,4,0,4"/>
            <TextBlock Text="Auto-detecting your API credentials from Kalshi..." Foreground="#94a3b8" FontSize="13"/>
        </StackPanel>

        <!-- Status Box -->
        <Border Grid.Row="1" Background="#131b2e" CornerRadius="8" Padding="14" Margin="0,0,0,16" BorderBrush="#1e293b" BorderThickness="1">
            <StackPanel>
                <Grid Margin="0,2">
                    <TextBlock Text="Local Private Key:" Foreground="#94a3b8" FontSize="12"/>
                    <TextBlock x:Name="TxtKeyStatus" Text="READY (kalshi_key.pem)" Foreground="#10b981" FontWeight="SemiBold" FontSize="12" HorizontalAlignment="Right"/>
                </Grid>
                <Grid Margin="0,4">
                    <TextBlock Text="Trading Engine:" Foreground="#94a3b8" FontSize="12"/>
                    <TextBlock x:Name="TxtEngineStatus" Text="ONLINE (127.0.0.1:8000)" Foreground="#38bdf8" FontWeight="SemiBold" FontSize="12" HorizontalAlignment="Right"/>
                </Grid>
                <Grid Margin="0,2">
                    <TextBlock Text="Live Account Balance:" Foreground="#94a3b8" FontSize="12"/>
                    <TextBlock x:Name="TxtBalance" Text="Pending Connection..." Foreground="#f59e0b" FontWeight="Bold" FontSize="12" HorizontalAlignment="Right"/>
                </Grid>
            </StackPanel>
        </Border>

        <!-- Input Section -->
        <StackPanel Grid.Row="2">
            <TextBlock Text="Kalshi API Key ID (UUID):" Foreground="#e2e8f0" FontWeight="SemiBold" FontSize="13" Margin="0,0,0,6"/>
            <TextBox x:Name="InputKeyId" Background="#1e293b" Foreground="#f8fafc" FontSize="14" Padding="10,8" BorderBrush="#334155" BorderThickness="1"/>
            <TextBlock Text="Copy your Key ID from Kalshi, or click below to open Kalshi settings." Foreground="#64748b" FontSize="11" Margin="0,4,0,12"/>

            <Button x:Name="BtnOpenKalshi" Content="1. Open Kalshi API Page in Chrome" Background="#1e293b" Foreground="#38bdf8" Margin="0,0,0,8"/>
            <Button x:Name="BtnPasteClipboard" Content="2. Paste from Clipboard" Background="#334155" Foreground="#f8fafc" Margin="0,0,0,8"/>
        </StackPanel>

        <!-- Action / Connect Button -->
        <StackPanel Grid.Row="3" Margin="0,12,0,0">
            <Button x:Name="BtnConnect" Content="Connect &amp; Sync Portfolio" Background="#10b981" Foreground="#000000" FontWeight="Bold" FontSize="15" Height="44"/>
            <TextBlock x:Name="TxtResult" Text="" Foreground="#10b981" FontSize="13" FontWeight="SemiBold" HorizontalAlignment="Center" Margin="0,8,0,0" TextWrapping="Wrap"/>
        </StackPanel>
    </Grid>
</Window>
"@

$reader = [System.Xml.XmlReader]::Create([System.IO.StringReader]::new($xaml))
$window = [System.Windows.Markup.XamlReader]::Load($reader)

$inputKeyId = $window.FindName("InputKeyId")
$btnOpenKalshi = $window.FindName("BtnOpenKalshi")
$btnPasteClipboard = $window.FindName("BtnPasteClipboard")
$btnConnect = $window.FindName("BtnConnect")
$txtResult = $window.FindName("TxtResult")
$txtBalance = $window.FindName("TxtBalance")

$projectDir = "c:\dev\github\personal\Betting"
$pemPath = Join-Path $projectDir "kalshi_key.pem"

$btnOpenKalshi.Add_Click({
    Start-Process "https://kalshi.com/account/api"
})

$btnPasteClipboard.Add_Click({
    $clip = [System.Windows.Forms.Clipboard]::GetText()
    if ($clip -match "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}") {
        $inputKeyId.Text = $Matches[0]
        $txtResult.Text = "Pasted Key ID from clipboard!"
    } else {
        $txtResult.Text = "Clipboard does not contain a UUID yet. Copy it from Kalshi first."
    }
})

$btnConnect.Add_Click({
    $keyId = $inputKeyId.Text.Trim()
    if (-not $keyId) {
        $txtResult.Text = "Please enter or paste your Kalshi Key ID."
        return
    }
    if (-not (Test-Path $pemPath)) {
        $txtResult.Text = "Private key file not found at $pemPath"
        return
    }
    
    $pemContent = Get-Content $pemPath -Raw
    $body = @{
        key_id = $keyId
        private_key = $pemContent
    } | ConvertTo-Json

    try {
        $txtResult.Text = "Verifying cryptographic signature with Kalshi..."
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/settings/kalshi" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
        if ($resp.success) {
            $txtResult.Text = "SUCCESS! Kalshi account linked."
            $txtBalance.Text = "$(" + $resp.balance_dollars + ")"
            $txtBalance.Foreground = [System.Windows.Media.Brushes]::LimeGreen
            [System.Windows.Forms.MessageBox]::Show("Kalshi account successfully connected!`n`nCash Balance: `$" + $resp.balance_dollars, "Betting Intelligence OS", "OK", "Information")
            $window.Close()
        } else {
            $txtResult.Text = "Error: " + $resp.message
        }
    } catch {
        $txtResult.Text = "Connection error: " + $_.Exception.Message
    }
})

# Auto-check timer
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds(2)
$timer.Add_Tick({
    # Check clipboard for UUID
    if (-not $inputKeyId.Text) {
        $clip = [System.Windows.Forms.Clipboard]::GetText()
        if ($clip -match "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}") {
            $inputKeyId.Text = $Matches[0]
            $txtResult.Text = "Auto-detected Key ID from clipboard!"
        }
    }
})
$timer.Start()

$window.ShowDialog() | Out-Null
