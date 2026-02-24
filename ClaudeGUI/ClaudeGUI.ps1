#Requires -Version 5.1
<#
.SYNOPSIS
    Interface graphique pour Claude AI (remplace la console par une fenêtre moderne).
.DESCRIPTION
    Lance Claude dans une fenêtre WPF avec thème sombre/clair, police lisible et expérience type "chat".
#>

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms

# Commande pour lancer Claude (modifiable si besoin)
$script:ClaudeCommand = "claude"

# Thèmes (couleurs)
$script:Themes = @{
    Dark = @{
        WindowBg    = "#1e1e2e"
        PanelBg     = "#313244"
        UserBg      = "#45475a"
        BotBg       = "#313244"
        Border      = "#585b70"
        Text        = "#cdd6f4"
        TextDim     = "#a6adc8"
        Accent      = "#89b4fa"
        InputBg     = "#313244"
        InputBorder = "#45475a"
    }
    Light = @{
        WindowBg    = "#eff1f5"
        PanelBg     = "#e6e9ef"
        UserBg      = "#89b4fa"
        BotBg       = "#ccd0da"
        Border      = "#acb0be"
        Text        = "#4c4f69"
        TextDim     = "#6c6f85"
        Accent      = "#1e66f5"
        InputBg     = "#ffffff"
        InputBorder = "#acb0be"
    }
}

$script:CurrentTheme = "Dark"
$script:Process = $null
$script:OutputStream = $null
$script:ErrorStream = $null

function Get-Xaml {
    param([string]$ThemeName)
    $t = $script:Themes[$ThemeName]
    @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Claude AI" Height="620" Width="800" MinHeight="400" MinWidth="500"
        Background="$($t.WindowBg)" WindowStartupLocation="CenterScreen"
        TextOptions.TextFormattingMode="Display" FontFamily="Segoe UI">
    <Window.Resources>
        <Style TargetType="Button">
            <Setter Property="Background" Value="$($t.Accent)"/>
            <Setter Property="Foreground" Value="#ffffff"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Padding" Value="16,8"/>
            <Setter Property="FontSize" Value="14"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Style.Triggers>
                <Trigger Property="IsMouseOver" Value="True">
                    <Setter Property="Opacity" Value="0.9"/>
                </Trigger>
            </Style.Triggers>
        </Style>
        <Style TargetType="TextBox">
            <Setter Property="Background" Value="$($t.InputBg)"/>
            <Setter Property="Foreground" Value="$($t.Text)"/>
            <Setter Property="BorderBrush" Value="$($t.InputBorder)"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="Padding" Value="10,10"/>
            <Setter Property="FontSize" Value="14"/>
            <Setter Property="CaretBrush" Value="$($t.Text)"/>
        </Style>
    </Window.Resources>
    <Grid Margin="12">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        <Border x:Name="BorderHeader" Grid.Row="0" Padding="12,10" Margin="0,0,0,8" CornerRadius="8" Background="$($t.PanelBg)" BorderBrush="$($t.Border)" BorderThickness="1">
            <StackPanel Orientation="Horizontal">
                <TextBlock x:Name="TitleText" Text="Claude" FontSize="18" FontWeight="SemiBold" Foreground="$($t.Text)" VerticalAlignment="Center"/>
                <Button x:Name="BtnTheme" Content="Mode clair" Margin="12,0,0,0" Width="100"/>
            </StackPanel>
        </Border>
        <Border x:Name="BorderLog" Grid.Row="1" Padding="10" CornerRadius="8" Background="$($t.PanelBg)" BorderBrush="$($t.Border)" BorderThickness="1">
            <ScrollViewer x:Name="ScrollViewer" VerticalScrollBarVisibility="Auto" HorizontalScrollBarVisibility="Auto" Padding="4">
                <TextBox x:Name="TbLog" IsReadOnly="True" TextWrapping="Wrap" AcceptsReturn="True"
                         VerticalScrollBarVisibility="Auto" BorderThickness="0" Background="Transparent"
                         Foreground="$($t.Text)" FontFamily="Cascadia Code, Consolas, Segoe UI" FontSize="13"
                         Padding="8" MinHeight="200"/>
            </ScrollViewer>
        </Border>
        <Border x:Name="BorderInput" Grid.Row="2" Padding="10,12" Margin="0,8,0,0" CornerRadius="8" Background="$($t.PanelBg)" BorderBrush="$($t.Border)" BorderThickness="1">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>
                <TextBox x:Name="TbInput" Grid.Column="0" Margin="0,0,10,0" MinHeight="44" MaxHeight="120"
                         VerticalContentAlignment="Top"
                         Text=""/>
                <Button x:Name="BtnSend" Grid.Column="1" Content="Envoyer" Width="90"/>
            </Grid>
        </Border>
    </Grid>
</Window>
"@
}

function Update-ThemeButton {
    param($btn)
    if ($script:CurrentTheme -eq "Dark") {
        $btn.Content = "Mode clair"
    } else {
        $btn.Content = "Mode sombre"
    }
}

function Apply-ThemeToWindow {
    param($win)
    $t = $script:Themes[$script:CurrentTheme]
    $conv = [System.Windows.Media.BrushConverter]::new()
    $win.Background = $conv.ConvertFromString($t.WindowBg)
    foreach ($name in @("BorderHeader","BorderLog","BorderInput")) {
        $b = $win.FindName($name)
        if ($b) { $b.Background = $conv.ConvertFromString($t.PanelBg); $b.BorderBrush = $conv.ConvertFromString($t.Border) }
    }
    $win.FindName("TitleText").Foreground = $conv.ConvertFromString($t.Text)
    $win.FindName("TbLog").Foreground = $conv.ConvertFromString($t.Text)
    $win.FindName("TbInput").Foreground = $conv.ConvertFromString($t.Text)
    $win.FindName("TbInput").Background = $conv.ConvertFromString($t.InputBg)
    $win.FindName("TbInput").BorderBrush = $conv.ConvertFromString($t.InputBorder)
    $win.FindName("BtnTheme").Content = if ($script:CurrentTheme -eq "Dark") { "Mode clair" } else { "Mode sombre" }
    $btn = $win.FindName("BtnSend")
    $btn.Background = $conv.ConvertFromString($t.Accent)
}

function Start-ClaudeProcess {
    param($appendLog)
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $script:ClaudeCommand
        $psi.Arguments = ""
        $psi.UseShellExecute = $false
        $psi.RedirectStandardInput = $true
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.CreateNoWindow = $true
        $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
        $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8

        $script:Process = [System.Diagnostics.Process]::Start($psi)
        $script:OutputStream = $script:Process.StandardOutput
        $script:ErrorStream = $script:Process.StandardError

        $reader = $script:Process.StandardOutput
        $errReader = $script:Process.StandardError

        $asyncRead = {
            while ($reader -and -not $reader.EndOfStream) {
                try {
                    $line = $reader.ReadLine()
                    if ($line -ne $null) {
                        $holder = [pscustomobject]@{ Text = $line }
                        [System.Windows.Application]::Current.Dispatcher.Invoke([action]{
                            $tb = $script:Win.FindName("TbLog")
                            $tb.AppendText($holder.Text + "`r`n")
                            $tb.ScrollToEnd()
                            $script:Win.FindName("ScrollViewer").ScrollToEnd()
                        })
                    }
                } catch { break }
            }
        }

        $asyncErrRead = {
            while ($errReader -and -not $errReader.EndOfStream) {
                try {
                    $line = $errReader.ReadLine()
                    if ($line -ne $null) {
                        $holder = [pscustomobject]@{ Text = "[err] " + $line }
                        [System.Windows.Application]::Current.Dispatcher.Invoke([action]{
                            $tb = $script:Win.FindName("TbLog")
                            $tb.AppendText($holder.Text + "`r`n")
                            $tb.ScrollToEnd()
                        })
                    }
                } catch { break }
            }
        }

        [void][System.Threading.Tasks.Task]::Run($asyncRead)
        [void][System.Threading.Tasks.Task]::Run($asyncErrRead)

        # Débloquer le prompt de sécurité "Is this a project you trust?" (option 1 = Yes)
        Start-Sleep -Milliseconds 1500
        try {
            $script:Process.StandardInput.WriteLine("1")
        } catch { }

        & $appendLog "Claude démarré. Tapez votre message ci-dessous et appuyez sur Entrée ou cliquez sur Envoyer.`r`n"
    } catch {
        & $appendLog "Erreur au démarrage de Claude: $_`r`nVérifiez que la commande '$script:ClaudeCommand' est disponible (PATH).`r`n"
    }
}

# Handlers (à enregistrer sur la fenêtre)
$script:BtnTheme_Click = {
    $script:CurrentTheme = if ($script:CurrentTheme -eq "Dark") { "Light" } else { "Dark" }
    $btn = $script:Win.FindName("BtnTheme")
    Update-ThemeButton -btn $btn
    Apply-ThemeToWindow -win $script:Win
}

$script:BtnSend_Click = {
    $tbIn = $script:Win.FindName("TbInput")
    $tbLog = $script:Win.FindName("TbLog")
    $text = $tbIn.Text.Trim()
    if ($text -eq "") { return }
    $tbIn.Clear()
    $tbLog.AppendText("Vous: $text`r`n")
    $tbLog.ScrollToEnd()
    if ($script:Process -and $script:Process.HasExited -eq $false -and $script:OutputStream) {
        try {
            $script:Process.StandardInput.WriteLine($text)
            $script:Process.StandardInput.Flush()
        } catch {
            $tbLog.AppendText("Erreur envoi: $_`r`n")
        }
    } else {
        $tbLog.AppendText("(Claude n'est pas démarré. Relancez l'application.)`r`n")
    }
}

$script:TbInput_KeyDown = {
    param($sender, $e)
    if ($e.Key -eq "Return" -and ($e.KeyboardDevice.Modifiers -band [System.Windows.Input.ModifierKeys]::Control) -eq 0) {
        $e.Handled = $true
        & $script:BtnSend_Click
    }
}

try {
    $xaml = Get-Xaml -ThemeName $script:CurrentTheme
    $reader = [System.Xml.XmlReader]::Create([System.IO.StringReader]::new($xaml))
    $script:Win = [System.Windows.Markup.XamlReader]::Load($reader)

    $script:Win.FindName("BtnTheme").AddHandler([System.Windows.Controls.Primitives.ButtonBase]::ClickEvent, [System.Windows.RoutedEventHandler]$script:BtnTheme_Click)
    $script:Win.FindName("BtnSend").AddHandler([System.Windows.Controls.Primitives.ButtonBase]::ClickEvent, [System.Windows.RoutedEventHandler]$script:BtnSend_Click)
    $script:Win.FindName("TbInput").AddHandler([System.Windows.UIElement]::KeyDownEvent, [System.Windows.Input.KeyEventHandler]$script:TbInput_KeyDown)

    $tbLog = $script:Win.FindName("TbLog")
    $appendLog = { param($s) $script:Win.Dispatcher.Invoke([action]{ $tbLog.AppendText($s); $tbLog.ScrollToEnd() }) }

    $script:Win.Add_Loaded({
        Start-ClaudeProcess -appendLog $appendLog
    })

    $script:Win.Add_Closing({
        if ($script:Process -and -not $script:Process.HasExited) {
            $script:Process.Kill()
        }
    })

    [void]$script:Win.ShowDialog()
} catch {
    [System.Windows.MessageBox]::Show("Erreur: $_", "Claude GUI", "OK", "Error")
}
